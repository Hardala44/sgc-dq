from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

class ClinicSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        clinic = getattr(request.user, 'clinica', None)
        if not clinic:
            return Response({"detail": "User has no clinic assigned."}, status=400)
        return Response({"num_boxes": clinic.num_boxes})

    def patch(self, request):
        clinic = getattr(request.user, 'clinica', None)
        if not clinic:
            return Response({"detail": "User has no clinic assigned."}, status=400)
        
        num_boxes = request.data.get('num_boxes')
        if num_boxes is not None:
            if num_boxes == "":
                clinic.num_boxes = None
            else:
                try:
                    num_boxes_val = int(num_boxes)
                    if num_boxes_val < 0:
                        return Response({"detail": "num_boxes must be positive"}, status=400)
                    clinic.num_boxes = num_boxes_val
                except ValueError:
                    return Response({"detail": "num_boxes must be an integer"}, status=400)
            clinic.save()
        
        return Response({"num_boxes": clinic.num_boxes})
