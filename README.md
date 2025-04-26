# protege

## Setup

1.  **Clone the repository:**

    ```bash
    git clone <repository_url>
    cd protege
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root directory and add necessary variables (e.g., API keys). Refer to `.env.example` if available.

4.  **Run the application:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    The application should now be running, typically on `http://localhost:3000`.

## Testing

Once the application is running, you can test the endpoints:

### Health Check

Open your browser or use `curl` to check the health endpoint:
