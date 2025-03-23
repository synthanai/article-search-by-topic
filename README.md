# Perplexity Article Grid

A single-page application that uses the Perplexity API to fetch and display articles in a grid layout. Users can search for articles by topic, specify the number of articles per topic, and set a date range.

## Features

-   Search for articles by multiple topics (comma-separated)
-   Specify the number of articles to fetch per topic
-   Set a date range for article search
-   Responsive grid layout for article display
-   Modern Material-UI design
-   Loading states and error handling

## Prerequisites

-   Node.js (v14 or higher)
-   npm (v6 or higher)
-   Perplexity API key

## Setup

1. Clone the repository
2. Install dependencies:
    ```bash
    npm install
    ```
3. Create a `.env` file in the root directory and add your Perplexity API key:
    ```
    REACT_APP_PERPLEXITY_API_KEY=your_api_key_here
    ```

## Running the Application

1. Start the development server:
    ```bash
    npm start
    ```
2. Open your browser and navigate to `http://localhost:3000`

## Usage

1. Enter one or more topics (comma-separated) in the "Topics" field
2. Specify how many articles you want per topic
3. Select a start date using the date picker
4. Click "Search Articles" to fetch and display the articles
5. Click "Read More" on any article card to open the full article in a new tab

## Technologies Used

-   React
-   Material-UI
-   Axios
-   Date-fns
-   Perplexity API
