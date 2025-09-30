# Nanyang Logistics Planner

A SAP-style logistics planner with Google Sheets-like interface designed for sand and gravel company daily trip management.

## Features

- **Google Sheets-like Interface**: Familiar spreadsheet-style layout with frozen columns and scrollable content
- **5-Trip Support**: Track up to 5 trips per lorry per day
- **Date Navigation**: Navigate between different days with intuitive chevron buttons
- **Dropdown Selections**: Pre-configured dropdown menus for pickup locations, products, and destinations
- **Real-time Status Tracking**: Checkbox completion status and commission tracking
- **SAP-style Design**: Professional, clean interface inspired by SAP applications
- **Responsive Design**: Works on desktop and mobile devices

## Usage

1. Open `logistics-planner.html` in your web browser
2. Use the date navigator to select the day you want to plan
3. Fill in trip details using the dropdown menus:
   - **Pick Up From**: Select pickup location
   - **Product**: Choose product type (aggregates, sand, etc.)
   - **Destination**: Select delivery destination
   - **Completion**: Check when trip is completed
   - **Commission**: Enter commission amount in RM

## Column Structure

- **Column A**: Lorry Plate Number (frozen column)
- **Columns B-F**: Trip 1 details
- **Columns G-K**: Trip 2 details
- **Columns L-P**: Trip 3 details
- **Columns Q-U**: Trip 4 details
- **Columns V-Z**: Trip 5 details

Each trip includes: Pick Up Location, Product Type, Destination, Completion Status, and Commission (RM)

## Technical Details

- Pure HTML, CSS, and JavaScript
- No external dependencies
- Responsive design with mobile support
- Local storage ready for future enhancements

## Demo

Simply open the `logistics-planner.html` file in any modern web browser to start using the application.