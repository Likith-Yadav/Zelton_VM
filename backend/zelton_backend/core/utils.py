"""
Utility functions for subscription and unit limit management
"""
from django.contrib.auth.models import User
from .models import Owner, Unit, PricingPlan


def check_owner_unit_limits(owner_id):
    """
    Comprehensive check of owner's unit limits
    Returns detailed information about current status and recommendations
    """
    try:
        owner = Owner.objects.get(id=owner_id)
    except Owner.DoesNotExist:
        return {
            'error': 'Owner not found',
            'valid': False
        }
    
    current_units = owner.calculated_total_units
    max_units = owner.max_units_allowed
    can_add_unit = owner.can_add_unit
    is_within_limits = owner.is_within_plan_limits
    suggested_plan = owner.suggested_plan_upgrade
    
    result = {
        'valid': True,
        'owner_id': owner_id,
        'current_units': current_units,
        'max_units_allowed': max_units,
        'can_add_unit': can_add_unit,
        'is_within_limits': is_within_limits,
        'subscription_plan': {
            'id': owner.subscription_plan.id if owner.subscription_plan else None,
            'name': owner.subscription_plan_name,
            'status': owner.subscription_status
        },
        'upgrade_required': not can_add_unit,
        'suggested_plan': None,
        'security_status': 'OK'
    }
    
    if suggested_plan:
        result['suggested_plan'] = {
            'id': suggested_plan.id,
            'name': suggested_plan.name,
            'min_units': suggested_plan.min_units,
            'max_units': suggested_plan.max_units,
            'monthly_price': float(suggested_plan.monthly_price),
            'yearly_price': float(suggested_plan.yearly_price),
            'features': suggested_plan.features
        }
    
    # Security check: Verify unit count matches database
    actual_unit_count = Unit.objects.filter(property__owner=owner).count()
    if actual_unit_count != current_units:
        result['security_status'] = 'WARNING'
        result['security_message'] = f'Unit count mismatch: calculated={current_units}, actual={actual_unit_count}'
    
    return result


def validate_unit_creation_request(owner_id, property_id):
    """
    Validate if an owner can create a unit in a specific property
    """
    try:
        owner = Owner.objects.get(id=owner_id)
        property_obj = owner.properties.get(id=property_id)
    except Owner.DoesNotExist:
        return {'valid': False, 'error': 'Owner not found'}
    except owner.properties.model.DoesNotExist:
        return {'valid': False, 'error': 'Property not found or does not belong to owner'}
    
    try:
        owner.validate_unit_limit()
        return {
            'valid': True,
            'owner_id': owner_id,
            'property_id': property_id,
            'current_units': owner.calculated_total_units,
            'max_units_allowed': owner.max_units_allowed,
            'can_add_unit': True
        }
    except ValueError as e:
        suggested_plan = owner.suggested_plan_upgrade
        return {
            'valid': False,
            'error': str(e),
            'owner_id': owner_id,
            'property_id': property_id,
            'current_units': owner.calculated_total_units,
            'max_units_allowed': owner.max_units_allowed,
            'can_add_unit': False,
            'suggested_plan': {
                'id': suggested_plan.id,
                'name': suggested_plan.name,
                'max_units': suggested_plan.max_units,
                'monthly_price': float(suggested_plan.monthly_price),
                'yearly_price': float(suggested_plan.yearly_price),
                'features': suggested_plan.features
            } if suggested_plan else None
        }


def get_upgrade_recommendations(owner_id):
    """
    Get upgrade recommendations for an owner based on their current unit count
    """
    try:
        owner = Owner.objects.get(id=owner_id)
    except Owner.DoesNotExist:
        return {'error': 'Owner not found'}
    
    current_units = owner.calculated_total_units
    current_plan = owner.subscription_plan
    
    # Get all plans that can accommodate current unit count
    available_plans = PricingPlan.objects.filter(
        is_active=True,
        max_units__gte=current_units
    ).exclude(
        id=current_plan.id if current_plan else None
    ).order_by('max_units')
    
    recommendations = []
    for plan in available_plans:
        is_recommended = (
            plan.max_units >= current_units and 
            (not current_plan or plan.max_units > current_plan.max_units)
        )
        
        recommendations.append({
            'id': plan.id,
            'name': plan.name,
            'min_units': plan.min_units,
            'max_units': plan.max_units,
            'monthly_price': float(plan.monthly_price),
            'yearly_price': float(plan.yearly_price),
            'features': plan.features,
            'is_recommended': is_recommended,
            'units_gained': plan.max_units - (current_plan.max_units if current_plan else 0)
        })
    
    return {
        'current_plan': {
            'id': current_plan.id if current_plan else None,
            'name': owner.subscription_plan_name,
            'max_units': current_plan.max_units if current_plan else 0
        },
        'current_units': current_units,
        'recommendations': recommendations
    }


def audit_unit_limits():
    """
    Audit all owners for unit limit compliance
    Returns list of owners who may have exceeded their limits
    """
    violations = []
    
    for owner in Owner.objects.all():
        if not owner.subscription_plan:
            violations.append({
                'owner_id': owner.id,
                'owner_email': owner.user.email,
                'issue': 'No subscription plan',
                'current_units': owner.calculated_total_units,
                'max_units_allowed': 0,
                'severity': 'HIGH'
            })
            continue
        
        if not owner.is_within_plan_limits:
            violations.append({
                'owner_id': owner.id,
                'owner_email': owner.user.email,
                'issue': 'Unit limit exceeded',
                'current_units': owner.calculated_total_units,
                'max_units_allowed': owner.max_units_allowed,
                'excess_units': owner.calculated_total_units - owner.max_units_allowed,
                'severity': 'HIGH',
                'suggested_plan': owner.suggested_plan_upgrade.name if owner.suggested_plan_upgrade else None
            })
    
    return {
        'total_violations': len(violations),
        'violations': violations,
        'audit_timestamp': '2024-01-01T00:00:00Z'  # This would be timezone.now() in real usage
    }
