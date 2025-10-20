# ZeltonLivings Mobile App

A comprehensive property management and rental payment platform built with React Native and Expo.

## Features

### For Property Owners (Landlords)
- **Property Management**: Add, edit, and manage multiple properties
- **Unit Management**: Create units with rent amounts, due dates, and occupancy status
- **Tenant Management**: Generate unique tenant keys for property access
- **Subscription System**: Tiered pricing plans based on number of properties
- **Payment Tracking**: Monitor rent collection and payment status
- **Financial Dashboard**: Real-time analytics on occupancy, revenue, and pending payments
- **Invoice Management**: Generate and track rental invoices

### For Tenants
- **Property Access**: Join properties using unique tenant keys
- **Payment Interface**: Make secure rent payments through the app
- **Payment History**: Track all payment transactions
- **Property Details**: View rental agreement and property information
- **Landlord Communication**: Direct contact with property owners
- **Payment Status**: Real-time view of due amounts and payment status

## Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Django REST Framework (Python)
- **Database**: SQLite (Development)
- **Authentication**: Firebase Auth (Planned)
- **Payment Gateway**: PhonePe Integration
- **UI Framework**: Custom components with Linear Gradients

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd zelton_mobile
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm start
```

4. Run on your preferred platform
```bash
# Android
npm run android

# iOS
npm run ios

# Web
npm run web
```

## Project Structure

```
zelton_mobile/
├── src/
│   ├── components/          # Reusable UI components
│   ├── constants/           # App constants and configuration
│   ├── screens/            # Screen components
│   ├── services/           # API services
│   ├── theme/              # Theme configuration
│   └── utils/              # Utility functions
├── App.js                  # Main app component
└── package.json
```

## Key Components

### GradientButton
A customizable button component with gradient backgrounds and loading states.

### GradientCard
A card component with gradient backgrounds for displaying content.

### InputField
A form input component with validation and error handling.

## Screens

1. **LandingScreen**: Welcome screen with app introduction
2. **AuthScreen**: Login and registration
3. **RoleSelectionScreen**: Choose between owner or tenant
4. **OwnerRegistrationScreen**: Multi-step owner registration
5. **TenantRegistrationScreen**: Tenant profile setup
6. **OwnerDashboardScreen**: Property owner dashboard
7. **TenantDashboardScreen**: Tenant dashboard
8. **PropertyManagementScreen**: Property management (placeholder)
9. **UnitManagementScreen**: Unit management (placeholder)
10. **TenantKeyJoinScreen**: Join property with tenant key
11. **PaymentScreen**: Payment processing (placeholder)
12. **PricingScreen**: Subscription plan selection
13. **ProfileScreen**: User profile management (placeholder)

## Backend Setup

The backend is built with Django REST Framework. To set up the backend:

1. Navigate to the backend directory
```bash
cd ../zelton_backend
```

2. Create and activate virtual environment
```bash
python -m venv venv
# On Windows
venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate
```

3. Install dependencies
```bash
pip install -r requirements.txt
```

4. Run migrations
```bash
python manage.py migrate
```

5. Create superuser
```bash
python manage.py createsuperuser
```

6. Start the development server
```bash
python manage.py runserver
```

## API Endpoints

The backend provides REST API endpoints for:

- Authentication (`/api/auth/`)
- Owners (`/api/owners/`)
- Properties (`/api/properties/`)
- Units (`/api/units/`)
- Tenants (`/api/tenants/`)
- Payments (`/api/paymets/`)
- Invoices (`/api/invoices/`)
- Pricing Plans (`/api/pricing-plans/`)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, email support@zeltonlivings.com or create an issue in the repository.
