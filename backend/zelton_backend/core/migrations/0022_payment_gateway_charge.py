from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0021_ownerpayout'),
    ]

    operations = [
        migrations.AddField(
            model_name='payment',
            name='payment_gateway_charge',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
    ]



