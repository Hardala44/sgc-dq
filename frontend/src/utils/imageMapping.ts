export const getPremiumImage = (productName: string, productIndex: number = 0): string => {
  const name = productName.toLowerCase();

  // Matriz de palabras clave y sus imágenes alternativas (Alta calidad Unsplash)
  const imageMap: Array<{ keys: string[]; images: string[] }> = [
    {
      keys: ['adhesivo', 'bonding', 'grabado', 'ácido'],
      images: [
        'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1581595219315-a187dd40c322?auto=format&fit=crop&w=800&q=80',
      ],
    },
    {
      keys: ['anestesia', 'aguja', 'cartucho', 'jeringa', 'local'],
      images: [
        'https://images.unsplash.com/photo-1584362917165-526a968579e8?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1579165466741-7f35e4755660?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?auto=format&fit=crop&w=800&q=80',
      ],
    },
    {
      keys: ['profilaxis', 'airflow', 'scaler', 'limpieza', 'cepillo'],
      images: [
        'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1629909615184-74f495363b67?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1588776813677-77d6f4efb09f?auto=format&fit=crop&w=800&q=80',
      ],
    },
    {
      keys: ['blanqueamiento', 'estética', 'carilla', 'composite'],
      images: [
        'https://images.unsplash.com/photo-1606265752439-1f18756aa5fc?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1588776814127-3a8c47f6a07e?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1609207825181-52d3214556df?auto=format&fit=crop&w=800&q=80',
      ],
    },
    {
      keys: ['implant', 'pilar', 'cirugía', 'sutura', 'hueso'],
      images: [
        'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1666214280327-249d26c0d5f2?auto=format&fit=crop&w=800&q=80',
      ],
    },
    {
      keys: ['guante', 'mascarilla', 'desechable', 'esterilización', 'bata'],
      images: [
        'https://images.unsplash.com/photo-1584982751601-97d8cb0f308d?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1583912267550-d4bcdd38a65a?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
      ],
    },
    {
      keys: ['rotatorio', 'turbina', 'micromotor', 'contraángulo'],
      images: [
        'https://images.unsplash.com/photo-1598256989800-fea5f6c8d0b8?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1588776814546-daab30f310ce?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1606811842303-2f6d9d97f0c6?auto=format&fit=crop&w=800&q=80',
      ],
    },
    {
      keys: ['radiología', 'rayos x', 'cbct', 'sensor', 'fósforo'],
      images: [
        'https://images.unsplash.com/photo-1559757175-9b22e16cb03b?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1579684453423-f84349ef60b0?auto=format&fit=crop&w=800&q=80',
      ],
    },
    {
      keys: ['laboratorio', 'cad', 'cam', 'fresa', 'yeso', 'escáner'],
      images: [
        'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80',
      ],
    },
    {
      keys: ['mobiliario', 'sillón', 'lámpara', 'taburete'],
      images: [
        'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
      ],
    },
    {
      keys: ['impresión', 'silicona', 'alginato', 'cubeta'],
      images: [
        'https://images.unsplash.com/photo-1579567761406-4684ee0c75b6?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1588776813677-77d6f4efb09f?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1580281657527-47f249e8f4df?auto=format&fit=crop&w=800&q=80',
      ],
    },
    {
      keys: ['ortodoncia', 'aligner', 'bracket', 'arco', 'tubo'],
      images: [
        'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1609207825181-52d3214556df?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1629909615184-74f495363b67?auto=format&fit=crop&w=800&q=80',
      ],
    },
  ];

  const matchedCategory = imageMap.find((item) => item.keys.some((key) => name.includes(key)));

  if (matchedCategory) {
    const imageIndex = productIndex % matchedCategory.images.length;
    return matchedCategory.images[imageIndex];
  }

  // Imagen por defecto elegante si no hay match
  return 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=800&q=80';
};