import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _


class RNFPasswordValidator:
    """
    RNF Seguridad #3: La contraseña debe cumplir con un patrón de mínimo
    8 caracteres que incluyan por lo menos una mayúscula, una minúscula y un número.
    """

    def validate(self, password, user=None):
        errors = []

        if len(password) < 8:
            errors.append(
                ValidationError(
                    _('La contraseña debe tener al menos 8 caracteres.'),
                    code='password_too_short',
                )
            )

        if not re.search(r'[A-Z]', password):
            errors.append(
                ValidationError(
                    _('La contraseña debe contener al menos una letra mayúscula.'),
                    code='password_no_upper',
                )
            )

        if not re.search(r'[a-z]', password):
            errors.append(
                ValidationError(
                    _('La contraseña debe contener al menos una letra minúscula.'),
                    code='password_no_lower',
                )
            )

        if not re.search(r'\d', password):
            errors.append(
                ValidationError(
                    _('La contraseña debe contener al menos un número.'),
                    code='password_no_digit',
                )
            )

        if errors:
            raise ValidationError(errors)

    def get_help_text(self):
        return _(
            'La contraseña debe tener mínimo 8 caracteres e incluir '
            'al menos una mayúscula, una minúscula y un número.'
        )
