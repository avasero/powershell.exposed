from django.contrib import admin
from .models import CustomUser, PowerShellSearch
# Register your models here.

@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    pass

@admin.register(PowerShellSearch)
class PowerShellSearchAdmin(admin.ModelAdmin):
    list_display = ['user', 'command', 'severity', 'risk_score', 'created_at']
    list_filter = ['severity', 'created_at']
    search_fields = ['command', 'user__email']
    readonly_fields = ['created_at']
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('user')