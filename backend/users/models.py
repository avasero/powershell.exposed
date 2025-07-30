from django.db import models
from django.contrib.auth.models import AbstractUser
from .managers import CustomUserManager
# Create your models here.

class CustomUser(AbstractUser):
    USERNAME_FIELD = 'email'
    email = models.EmailField(unique=True)
    REQUIRED_FIELDS = []

    objects = CustomUserManager()


class PowerShellSearch(models.Model):
    user = models.ForeignKey(
        'CustomUser', 
        on_delete=models.CASCADE, 
        related_name='searches'
    )
    command = models.TextField(help_text='O comando PowerShell que foi analisado')
    created_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)
    analysis_result = models.JSONField(
        blank=True, 
        null=True, 
        help_text='Resultado da análise em JSON'
    )
    risk_score = models.IntegerField(
        blank=True, 
        null=True, 
        help_text='Score de risco da análise'
    )
    severity = models.CharField(
        max_length=20, 
        blank=True, 
        null=True, 
        help_text='Severidade encontrada'
    )

    class Meta:
        verbose_name = 'PowerShell Search'
        verbose_name_plural = 'PowerShell Searches'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.command[:50]}..."
