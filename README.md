# RentIt - A Community Rental Platform

RentIt is a web application designed to facilitate peer-to-peer rentals within university communities. The platform allows students to list items they own for rent and rent items from other students, creating a sustainable sharing economy on campus.

## Features

- **User Authentication**: Secure login and registration system with Google OAuth integration
- **Item Listings**: Users can list their items with photos, descriptions, pricing, and availability
- **Search & Filter**: Find items by category, availability dates, and keywords
- **Rental Management**: Request items, approve/deny rental requests, and manage your listings
- **User Profiles**: View user ratings, reviews, and listing history
- **Real-time Notifications**: Get notified about rental requests and updates
- **Review System**: Leave and receive reviews after completed rentals

## Pages

- **Home Page**: Browse all available items for rent
- **Item Details**: View detailed information about a specific item
- **List Item**: Multi-step form to create a new listing
- **My Listings**: Manage your listed items
- **User Listings**: View items listed by a specific user and their reviews
- **Edit Listing**: Update information for your listed items
- **Rental Requests**: Review and manage incoming rental requests
- **Authentication**: Login and registration page

## Technology Stack

- **Frontend**: HTML, CSS (Tailwind CSS), JavaScript
- **Backend**: Node.js
- **Database**: MongoDB (with Mongoose ODM)
- **Authentication**: Local strategy and Google OAuth
- **Testing**: Jest with code coverage reporting

## Getting Started

### Prerequisites

- Node.js and npm installed
- MongoDB instance (local or cloud)

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/rentit.git
   cd rentit
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/rentit
   SESSION_SECRET=your_session_secret
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

4. Start the development server
   ```
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Project Structure

- **/public**: Static assets and frontend files
  - HTML pages
  - CSS styles
  - Client-side JavaScript
  - Images
- **/src**: Server-side code
  - **/models**: Database models (User, Rental, etc.)
  - **/routes**: API endpoints
  - **/middleware**: Custom middleware functions
  - **/config**: Configuration files

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Tailwind CSS for the UI framework
- Font Awesome for icons
- All contributors who have helped shape this project
