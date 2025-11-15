# ZeltonLivings - Complete Setup Instructions

## 🚀 Project Overview

ZeltonLivings is a comprehensive property management and rental payment platform with:
- **Backend**: Django REST Framework with SQLite database
- **Frontend**: React Native with Expo (cross-platform mobile app)
- **Features**: Property management, tenant management, payment processing, subscription system

## 📁 Project Structure

```
Zelton_App/
├── zelton_backend/          # Django backend
│   ├── zelton_backend/      # Django project settings
│   ├── core/                # Main app with models, views, serializers
│   ├── venv/                # Python virtual environment
│   └── manage.py
├── zelton_mobile/           # React Native frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── screens/         # App screens
│   │   ├── services/        # API services
│   │   ├── theme/           # App theme and styling
│   │   ├── utils/           # Utility functions
│   │   └── constants/       # App constants
│   ├── App.js
│   └── package.json
└── setup_instructions.md
```

## 🛠️ Backend Setup (Django)

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)

### Step 1: Navigate to Backend Directory
```bash
cd zelton_backend
```

### Step 2: Activate Virtual Environment
```bash
# On Windows
venv\Scripts\activate

# On macOS/Linux
source venv/bin/activate
```

### Step 3: Install Dependencies (Already Done)
```bash
pip install django djangorestframework django-cors-headers pillow python-decouple requests
```

### Step 4: Run Migrations (Already Done)
```bash
python manage.py migrate
```

### Step 5: Populate Pricing Plans (Already Done)
```bash
python manage.py populate_pricing_plans
```

### Step 6: Create Superuser (Optional)
```bash
python manage.py createsuperuser
```

### Step 7: Start Backend Server
```bash
python manage.py runserver
```

The backend will be available at: `http://localhost:8000`
- API endpoints: `http://localhost:8000/api/`
- Admin panel: `http://localhost:8000/admin/`

## 📱 Frontend Setup (React Native)

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI: `npm install -g @expo/cli`

### Step 1: Navigate to Mobile Directory
```bash
cd zelton_mobile
```

### Step 2: Install Dependencies (Already Done)
```bash
npm install
```

### Step 3: Start Development Server
```bash
# Start Expo development server
npm start

# Or run on specific platform
npm run android    # Android
npm run ios        # iOS (macOS only)
npm run web        # Web browser
```

## 🎯 App Features Implemented

### ✅ Completed Features

#### Backend (Django)
- ✅ Complete database models (Owner, Property, Unit, Tenant, Payment, etc.)
- ✅ REST API endpoints for all functionality
- ✅ Admin interface for data management
- ✅ Pricing plans system with dynamic pricing
- ✅ Payment transaction handling
- ✅ CORS configuration for mobile app
- ✅ Comprehensive serializers and views

#### Frontend (React Native)
- ✅ Beautiful landing screen with animations
- ✅ Authentication screens (Login/Register)
- ✅ Role selection (Owner/Tenant)
- ✅ Multi-step owner registration
- ✅ Tenant registration
- ✅ Owner dashboard with analytics
- ✅ Tenant dashboard with payment status
- ✅ Tenant key joining system
- ✅ Pricing plan selection
- ✅ Modern UI with linear gradients
- ✅ Reusable components (GradientButton, GradientCard, InputField)
- ✅ Navigation between screens
- ✅ Form validation and error handling

### 🔄 App Flow

#### Owner Flow:
1. **Landing** → **Auth** → **Role Selection** → **Owner Registration** → **Pricing** → **Owner Dashboard**

#### Tenant Flow:
1. **Landing** → **Auth** → **Role Selection** → **Tenant Registration** → **Tenant Key Join** → **Tenant Dashboard**

## 🎨 UI/UX Features

- **Modern Design**: Clean, professional interface with linear gradients
- **Responsive**: Works on all screen sizes
- **Animations**: Smooth transitions and micro-interactions
- **Accessibility**: Proper contrast ratios and touch targets
- **Consistent Theming**: Unified color scheme and typography

## 🔧 Key Components

### GradientButton
- Customizable gradient backgrounds
- Loading states
- Multiple variants (primary, secondary, accent, etc.)
- Different sizes (small, medium, large)

### GradientCard
- Gradient backgrounds
- Multiple variants
- Consistent styling
- Shadow effects

### InputField
- Form validation
- Error handling
- Left/right icons
- Multiple input types
- Secure text entry

## 📊 Database Models

### Core Models:
- **Owner**: Landlord profiles with subscription details
- **Property**: Property information and management
- **Unit**: Rental units with rent amounts and occupancy
- **Tenant**: Tenant profiles linked to properties
- **TenantKey**: Unique keys for property access
- **Payment**: Rent payment transactions
- **Invoice**: Monthly rent invoices
- **PricingPlan**: Subscription tiers for landlords

## 💳 Payment System

### PhonePe Integration (Planned)
- Secure UPI, card, and wallet payments
- Subscription payment processing
- Rent payment processing
- Payment verification and callbacks

### Pricing Structure:
- 1-10 houses: ₹2,500/month
- 11-20 houses: ₹5,000/month
- 21-30 houses: ₹7,500/month
- 31-40 houses: ₹10,000/month
- 41-50 houses: ₹12,500/month
- 51-60 houses: ₹15,000/month
- 61-70 houses: ₹17,500/month
- 71-80 houses: ₹20,000/month
- 81-90 houses: ₹22,500/month
- 91-100 houses: ₹25,000/month
- 101-110 houses: ₹27,500/month
- 111-120 houses: ₹30,000/month
- 121+ houses: ₹32,500+/month
- Yearly billing: 1 month free (pay for 11 months)

## 🚀 Running the Complete App

### Terminal 1: Backend Server
```bash
cd zelton_backend
venv\Scripts\activate  # Windows
python manage.py runserver
```

### Terminal 2: Frontend Server
```bash
cd zelton_mobile
npm start
```

### Terminal 3: Mobile App (Optional)
```bash
# For Android
npm run android

# For iOS (macOS only)
npm run ios

# For Web
npm run web
```

## 🔍 Testing the App

1. **Start both servers** (backend and frontend)
2. **Open the app** in your browser or mobile device
3. **Test the flow**:
   - Landing screen → Auth → Role selection
   - Try both Owner and Tenant flows
   - Test form validation
   - Navigate between screens

## 📝 Next Steps for Production

### Backend:
- [ ] Add Firebase authentication
- [ ] Implement PhonePe payment gateway
- [ ] Add email notifications
- [ ] Implement file upload for documents
- [ ] Add comprehensive API documentation
- [ ] Set up production database (PostgreSQL)
- [ ] Add logging and monitoring

### Frontend:
- [ ] Implement Firebase authentication
- [ ] Add PhonePe payment integration
- [ ] Implement push notifications
- [ ] Add image upload functionality
- [ ] Implement offline support
- [ ] Add comprehensive error handling
- [ ] Optimize performance

## 🐛 Troubleshooting

### Common Issues:

1. **Backend not starting**:
   - Check if virtual environment is activated
   - Ensure all dependencies are installed
   - Check if port 8000 is available

2. **Frontend not starting**:
   - Check if Node.js is installed
   - Clear npm cache: `npm cache clean --force`
   - Delete node_modules and reinstall: `rm -rf node_modules && npm install`

3. **API connection issues**:
   - Ensure backend is running on port 8000
   - Check CORS settings in Django
   - Verify API_BASE_URL in constants

## 📞 Support

For any issues or questions:
- Check the console logs for errors
- Verify all dependencies are installed
- Ensure both servers are running
- Check network connectivity

## 🎉 Congratulations!

You now have a fully functional property management app with:
- Complete backend API
- Beautiful mobile interface
- User authentication flow
- Property and tenant management
- Payment system foundation
- Modern UI/UX design

The app is ready for further development and can be extended with additional features as needed!
