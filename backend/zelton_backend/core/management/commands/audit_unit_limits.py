from django.core.management.base import BaseCommand
from core.models import Owner, Unit
from core.utils import audit_unit_limits
import json


class Command(BaseCommand):
    help = 'Audit unit limits across all owners'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output',
            type=str,
            help='Output file path for audit results (JSON format)',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed output',
        )

    def handle(self, *args, **options):
        self.stdout.write('Starting unit limits audit...')
        
        # Run the audit
        audit_results = audit_unit_limits()
        
        # Display results
        if options['verbose']:
            self.stdout.write(f"Total violations found: {audit_results['total_violations']}")
            
            for violation in audit_results['violations']:
                self.stdout.write(
                    f"\nOwner ID: {violation['owner_id']} "
                    f"({violation['owner_email']})"
                )
                self.stdout.write(f"Issue: {violation['issue']}")
                self.stdout.write(f"Current units: {violation['current_units']}")
                self.stdout.write(f"Max allowed: {violation['max_units_allowed']}")
                self.stdout.write(f"Severity: {violation['severity']}")
                
                if 'excess_units' in violation:
                    self.stdout.write(f"Excess units: {violation['excess_units']}")
                
                if 'suggested_plan' in violation and violation['suggested_plan']:
                    self.stdout.write(f"Suggested plan: {violation['suggested_plan']}")
        else:
            self.stdout.write(f"Audit completed. Found {audit_results['total_violations']} violations.")
        
        # Save to file if requested
        if options['output']:
            with open(options['output'], 'w') as f:
                json.dump(audit_results, f, indent=2, default=str)
            self.stdout.write(f"Audit results saved to {options['output']}")
        
        # Return appropriate exit code
        if audit_results['total_violations'] > 0:
            self.stdout.write(
                self.style.WARNING(
                    f"Found {audit_results['total_violations']} violations that need attention."
                )
            )
            return 1
        else:
            self.stdout.write(
                self.style.SUCCESS("All owners are within their unit limits.")
            )
            return 0
