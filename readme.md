
# GoHighLevel Custom Values Manager

A marketplace app for GoHighLevel that allows agency owners to efficiently manage custom values and custom fields across all their subaccounts.

## Features

- **View Custom Values & Fields**: Browse all custom values and fields for any subaccount
- **Create New Items**: Add custom values and fields with support for various data types
- **Edit & Delete**: Modify or remove existing custom values and fields
- **Bulk Operations**: Copy custom values and fields from one subaccount to multiple others
- **Data Type Support**: 
  - Text, Text Area, Number
  - Phone, Email
  - Date, Date & Time
  - Checkbox
  - Single/Multiple Options
  - File Upload
  - Signature
- **Search & Filter**: Quickly find specific custom values or fields
- **Modern UI**: Clean, responsive interface with dark mode design

## Prerequisites

- Node.js (v16 or higher)
- GoHighLevel Agency account ($297 or $497 plan)
- GoHighLevel Marketplace App credentials

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ghl-custom-values-manager
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file by copying `.env.example`:
```bash
cp .env.example .env
```

4. Configure your environment variables:
   - `GHL_APP_CLIENT_ID`: Your GoHighLevel app's client ID
   - `GHL_APP_CLIENT_SECRET`: Your GoHighLevel app's client secret
   - `GHL_API_DOMAIN`: GoHighLevel API domain (default: https://services.leadconnectorhq.com)
   - `PORT`: Server port (default: 3000)
   - `REDIRECT_URI`: OAuth redirect URI (update in production)

## Setting Up Your GoHighLevel Marketplace App

1. Go to the [GoHighLevel Marketplace](https://marketplace.gohighlevel.com)
2. Create a new app
3. Configure the following:
   - **App Type**: Public
   - **Distribution**: Agency & Sub-Account
   - **Redirect URL**: `http://localhost:3000/authorize-handler` (for development)
   - **Required Scopes**:
     - `locations.readonly`
     - `locations/customValues.readonly`
     - `locations/customValues.write`
     - `locations/customFields.readonly`
     - `locations/customFields.write`

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The application will be available at `http://localhost:3000`

## Usage

1. **Connect Your Account**:
   - Click "Connect to GoHighLevel"
   - Enter your app's Client ID when prompted
   - Authorize the app in the GoHighLevel OAuth flow

2. **Select a Subaccount**:
   - Choose a subaccount from the left sidebar
   - View its custom values and fields

3. **Manage Custom Values**:
   - Click "Add Custom Value" to create new values
   - Edit or delete existing values using the action buttons
   - Use the search bar to filter values

4. **Manage Custom Fields**:
   - Switch to the "Custom Fields" tab
   - Create fields with various data types
   - Configure options for dropdown fields

5. **Bulk Operations**:
   - Select a source subaccount
   - Go to the "Bulk Operations" tab
   - Choose target subaccounts
   - Copy all custom values or fields with one click

## Deployment

### Deploy to Render

1. Push your code to GitHub
2. Sign up on [Render](https://render.com)
3. Create a new Web Service
4. Connect your GitHub repository
5. Configure environment variables:
   - `GHL_APP_CLIENT_ID`
   - `GHL_APP_CLIENT_SECRET`
   - `GHL_API_DOMAIN`
   - `REDIRECT_URI` (update to your Render URL)
6. Deploy the application

### Deploy to Heroku

1. Install the Heroku CLI
2. Create a new Heroku app:
```bash
heroku create your-app-name
```

3. Set environment variables:
```bash
heroku config:set GHL_APP_CLIENT_ID=your_client_id
heroku config:set GHL_APP_CLIENT_SECRET=your_client_secret
heroku config:set GHL_API_DOMAIN=https://services.leadconnectorhq.com
```

4. Deploy:
```bash
git push heroku main
```

## API Endpoints

### Authentication
- `GET /authorize-handler` - OAuth callback handler

### Custom Values
- `GET /api/custom-values/:locationId` - Get all custom values
- `POST /api/custom-values/:locationId` - Create custom value
- `PUT /api/custom-values/:locationId/:customValueId` - Update custom value
- `DELETE /api/custom-values/:locationId/:customValueId` - Delete custom value

### Custom Fields
- `GET /api/custom-fields/:locationId` - Get all custom fields
- `POST /api/custom-fields/:locationId` - Create custom field
- `PUT /api/custom-fields/:locationId/:customFieldId` - Update custom field
- `DELETE /api/custom-fields/:locationId/:customFieldId` - Delete custom field

### Bulk Operations
- `POST /api/bulk/copy-custom-values` - Copy values between locations
- `POST /api/bulk/copy-custom-fields` - Copy fields between locations

### Locations
- `GET /api/locations` - Get all subaccounts

## Security Considerations

- Never commit your `.env` file
- Use environment variables for sensitive data
- Implement proper token storage in production (use a database)
- Add rate limiting for production deployments
- Use HTTPS in production

## Troubleshooting

### Common Issues

1. **Authentication Failed**:
   - Verify your Client ID and Secret are correct
   - Ensure redirect URI matches your app settings

2. **API Errors**:
   - Check that all required scopes are enabled
   - Verify the subaccount has proper permissions

3. **Cannot Load Locations**:
   - Ensure you have an agency-level account
   - Check that the app has proper agency permissions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues or questions:
- Check the [GoHighLevel API Documentation](https://highlevel.stoplight.io/docs/integrations)
- Join the [GoHighLevel Developer Community](https://www.facebook.com/groups/gohighlevelcommunity)
- Contact GoHighLevel support at support@gohighlevel.com

## Changelog

### Version 1.0.0
- Initial release
- Custom values management
- Custom fields management
- Bulk copy operations
- Modern UI with search and filtering
