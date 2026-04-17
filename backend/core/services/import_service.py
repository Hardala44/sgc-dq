
import pandas as pd
import unicodedata
import hashlib
import json
import logging
from datetime import datetime
from django.db import transaction
from django.core.files.base import ContentFile
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import get_user_model
from rapidfuzz import process, fuzz
from core.models import Clinica, ClinicLegalEntity, ClinicAlias, ImportBatch, ExpenseCategory, Gasto
from django.utils.crypto import get_random_string

logger = logging.getLogger(__name__)
User = get_user_model()

def normalize_name(name):
    if not isinstance(name, str):
        return ""
    # Normalize unicode characters
    name = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode('utf-8')
    name = name.upper().strip()
    # Basic cleanup
    for suffix in [" S.L.", " S.L", " SL", " S.A.", " SA", " S.C.P.", " SCP"]:
        if name.endswith(suffix):
            name = name[:-len(suffix)]
    return name.strip()

def calculate_checksum(file_path):
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

class ExcelParser:
    def __init__(self, file_path):
        self.file_path = file_path
        self.clinics_df = None
        self.expenses_data = [] # List of dicts
        self.unresolved_aliases = [] # List of dicts

    def parse(self):
        self._parse_clinics_master()
        self._parse_expenses()
        return {
            'clinics': self.clinics_df,
            'expenses': self.expenses_data,
            'unresolved': self.unresolved_aliases
        }

    def _parse_clinics_master(self):
        # Read "Datos Clinicas"
        df = pd.read_excel(self.file_path, sheet_name="Datos Clinicas")
        # Rename columns to standard internal names
        # Expected: "Clínica DentalQuality" -> global_name, "CIF" -> cif
        # We need to map dynamic columns if names vary, but assuming fixed structure as per prompt.
        
        # Normalize headers
        df.columns = [str(c).strip() for c in df.columns]
        
        # Required columns mapping
        col_map = {
            "Clínica DentalQuality": "global_name",
            "CIF": "cif",
            "REG. SANITARIO": "reg_sanitario",
            "Nombre fiscal": "nombre_fiscal",
            "Dirección": "direccion",
            "Población": "poblacion",
            "Provincia": "provincia",
            "Teléfono": "telefono", # Checking if accent exists
            "Telefono": "telefono",
            "e-mail responsable I": "email1",
            "e-mail responsable II": "email2",
            "e-mail compras": "email_compras"
        }
        
        # Filter and rename
        cols_to_keep = []
        for exact, target in col_map.items():
            if exact in df.columns:
                df.rename(columns={exact: target}, inplace=True)
                cols_to_keep.append(target)
            elif target == "telefono" and "Teléfono" in df.columns: # fallback
                 df.rename(columns={"Teléfono": target}, inplace=True)
                 cols_to_keep.append(target)

        # Ensure we have essential cols
        if "global_name" not in df.columns or "cif" not in df.columns:
            raise ValueError("Sheet 'Datos Clinicas' missing required columns: 'Clínica DentalQuality' or 'CIF'")

        self.clinics_df = df
        
    def _parse_expenses(self):
        sheets = ["Q1", "Q2", "Q3", "Q4"]
        # Sheets might not exist, handle gracefully? Prompt says "CURRENT STRUCTURE (MUST MATCH)"
        
        xls = pd.ExcelFile(self.file_path)
        
        for sheet_name in sheets:
            if sheet_name not in xls.sheet_names:
                logger.warning(f"Sheet {sheet_name} not found.")
                continue
                
            # Read with MultiIndex header
            df = pd.read_excel(self.file_path, sheet_name=sheet_name, header=[0, 1])
            
            # Identify Clinic Name column
            # It's usually the first one. Level 0: Quarter name or Year, Level 1: "NOMBRE CLÍNICA GLOBAL"
            # Adjust to find the column that looks like clinic name
            
            clinic_col_idx = -1
            for i, col in enumerate(df.columns):
                # col is tuple (level0, level1)
                if isinstance(col[1], str) and "CLÍNICA GLOBAL" in col[1].upper():
                    clinic_col_idx = i
                    break
            
            if clinic_col_idx == -1:
                # Fallback: assume first column
                clinic_col_idx = 0
            
            # Forward fill clinic names
            df.iloc[:, clinic_col_idx] = df.iloc[:, clinic_col_idx].ffill()
            
            # Rename clinic col for easier access
            clinic_col_name = df.columns[clinic_col_idx]
            
            # Iterate over columns to extract expenses
            for col in df.columns:
                if col == clinic_col_name:
                    continue
                
                year_raw, category_raw = col
                
                # Filter valid expense columns
                # 1. Year must be int (e.g. 2024, 2025)
                try:
                    year = int(year_raw)
                except (ValueError, TypeError):
                    continue # Skip "Total Q2", etc.
                
                # 2. Category must NOT contain "TOTAL"
                category_str = str(category_raw).strip() # Trim leading spaces (Q2 issue)
                if "TOTAL" in category_str.upper() or "UNNAMED" in category_str.upper():
                    continue

                # Extract data
                # We need rows where amount is not null (or keep 0?)
                # Prompt: "ignore NaN amounts; optionally ignore zeros"
                
                for idx, row in df.iterrows():
                    clinic_alias = row[clinic_col_name]
                    if pd.isna(clinic_alias):
                        continue # Should not happen after ffill unless start is empty
                        
                    amount = row[col]
                    if pd.isna(amount):
                        continue
                        
                    # Determine Quarter from sheet name (e.g. "Q1" -> 1)
                    q_map = {"Q1": 1, "Q2": 2, "Q3": 3, "Q4": 4}
                    quarter = q_map.get(sheet_name, 0)
                    
                    self.expenses_data.append({
                        'alias_raw': clinic_alias,
                        'year': year,
                        'quarter': quarter,
                        'category': category_str,
                        'amount': amount,
                        'source_sheet': sheet_name,
                        'source_row': idx + 3 # +3 for header rows (approx)
                    })

class ImportService:
    def __init__(self, file_path, force=False):
        self.file_path = file_path
        self.force = force
        self.parser = ExcelParser(file_path)
        self.stats = {
            'clinics_created': 0,
            'clinics_updated': 0,
            'legal_entities_created': 0,
            'expenses_created': 0,
            'users_created': 0,
            'emails_sent': 0
        }
    
    def run(self):
        # 1. Checksum
        checksum = calculate_checksum(self.file_path)
        if ImportBatch.objects.filter(checksum=checksum).exists():
            if not self.force:
                raise ValueError(f"File with checksum {checksum} already imported. Use force=True to re-import.")
            else:
                logger.warning(f"Force re-import: Deleting batch with checksum {checksum}")
                ImportBatch.objects.filter(checksum=checksum).delete()
        
        batch = ImportBatch.objects.create(
            original_filename=self.file_path,
            checksum=checksum
        )
        
        print("Starting Parse...")
        data = self.parser.parse()
        print("Parse Complete.")
        self.unresolved = data['unresolved']
        
        with transaction.atomic():
        # if True:
            # 3. Import Clinics & Entities
            print("Importing Clinics...")
            self._import_clinics(data['clinics'])
            print("Clinics Imported.")
            
            # 4. Resolve Aliases & Categories
            print("Importing Expenses...")
            self._import_expenses(data['expenses'], batch)
            print("Expenses Imported.")
            
            # 5. Users
            print("Creating Users...")
            self._create_users()
            print("Users Created.")

        batch.stats = self.stats
        batch.save()
        
        # Fetch unresolved aliases for report
        self.unresolved = list(ClinicAlias.objects.filter(method='unresolved').values('alias_raw', 'alias_norm'))
        return self.stats, self.unresolved

    def _import_clinics(self, df):
        for _, row in df.iterrows():
            global_name = row.get('global_name')
            cif = row.get('cif')
            
            if pd.isna(global_name) or pd.isna(cif):
                continue
                
            # Upsert Global Clinic
            name_norm = normalize_name(global_name)
            clinic, created = Clinica.objects.update_or_create(
                nombre_norm=name_norm,
                defaults={
                    'nombre': global_name
                }
            )
            if created:
                self.stats['clinics_created'] += 1
            else:
                self.stats['clinics_updated'] += 1
                
            # Upsert Legal Entity
            # Determine email
            email = row.get('email1') or row.get('email_compras') or row.get('email2') or ""
            
            ClinicLegalEntity.objects.update_or_create(
                cif=cif,
                defaults={
                    'clinic': clinic,
                    'reg_sanitario': row.get('reg_sanitario', ''),
                    'nombre_fiscal': row.get('nombre_fiscal', ''),
                    'direccion': row.get('direccion', ''),
                    'poblacion': row.get('poblacion', ''),
                    'provincia': row.get('provincia', ''),
                    'telefono': str(row.get('telefono', '')),
                    'email_preferred': email
                }
            )
            self.stats['legal_entities_created'] += 1

    def _resolve_clinic(self, alias_raw):
        alias_norm = normalize_name(alias_raw)
        
        # 1. Check exact match in Aliases
        alias_obj = ClinicAlias.objects.filter(alias_norm=alias_norm).first()
        if alias_obj:
            if alias_obj.ignore:
                return None
            if alias_obj.clinic:
                return alias_obj.clinic
                
        # 2. Check exact match in Clinics
        clinic = Clinica.objects.filter(nombre_norm=alias_norm).first()
        if clinic:
            # Create alias for future
            ClinicAlias.objects.get_or_create(
                alias_norm=alias_norm,
                defaults={'alias_raw': alias_raw, 'clinic': clinic, 'method': 'exact', 'confidence': 1.0}
            )
            return clinic
            
        # 3. Fuzzy Match
        # Get all normalized clinic names
        choices = list(Clinica.objects.values_list('nombre_norm', flat=True))
        extraction = process.extractOne(alias_norm, choices, scorer=fuzz.token_sort_ratio)
        
        if extraction:
            match_name, score, idx = extraction
            if score >= 90:
                clinic = Clinica.objects.get(nombre_norm=match_name)
                ClinicAlias.objects.create(
                    alias_raw=alias_raw,
                    alias_norm=alias_norm,
                    clinic=clinic,
                    method='fuzzy',
                    confidence=score/100.0
                )
                return clinic
            elif score >= 80:
                 # Create unresolved alias
                 ClinicAlias.objects.get_or_create(
                    alias_norm=alias_norm,
                    defaults={'alias_raw': alias_raw, 'method': 'fuzzy_suggestion', 'confidence': score/100.0}
                )
                 return None
        
        # Unresolved
        ClinicAlias.objects.get_or_create(
            alias_norm=alias_norm,
            defaults={'alias_raw': alias_raw, 'method': 'unresolved'}
        )
        return None

    def _import_expenses(self, expenses_list, batch):
        for item in expenses_list:
            clinic = self._resolve_clinic(item['alias_raw'])
            if not clinic:
                continue

            # Category
            cat_name = item['category']
            cat_norm = normalize_name(cat_name)
            category, _ = ExpenseCategory.objects.get_or_create(
                nombre_norm=cat_norm,
                defaults={'nombre': cat_name}
            )
            
            # Upsert Expense
            Gasto.objects.update_or_create(
                clinic=clinic,
                year=item['year'],
                quarter=item['quarter'],
                category=category,
                defaults={
                    'amount': item['amount'],
                    'source_sheet': item['source_sheet'],
                    'source_row': item['source_row'],
                    'last_import_batch': batch
                }
            )
            self.stats['expenses_created'] += 1

    def _create_users(self):
        # Create user for each Legal Entity that doesn't have one
        entities = ClinicLegalEntity.objects.all()
        count = entities.count()
        print(f"Entities to process: {count}")
        for idx, entity in enumerate(entities):
             if idx % 5 == 0:
                 print(f"Processing entity {idx}/{count}...")
             # Sanitize username (CIF) to be valid for Django
             raw_username = entity.cif
             username = raw_username.replace(" ", "_").replace("(", "").replace(")", "").replace("/", "_")
             if not User.objects.filter(username=username).exists():
                 # Create user
                 # print(f"Creating user for {username}...")
                 password = get_random_string(12)
                 email = entity.email_preferred
                 
                 user = User.objects.create_user(
                     username=username,
                     email=email,
                     password=password
                 )
                 user.legal_entity = entity
                 user.clinica = entity.clinic
                 user.must_change_password = True
                 user.save()
                 
                 self.stats['users_created'] += 1
                 # print(f"Created user {username} with password {password}")
                 print(f"User {username} created.")
