exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        ok: false,
        message: "Method not allowed.",
      }),
    };
  }

  try {
    const { username, password } = JSON.parse(event.body || "{}");

    const validUsername = process.env.ADMIN_USERNAME;
    const validPassword = process.env.ADMIN_PASSWORD;

    if (!validUsername || !validPassword) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          ok: false,
          message: "Admin credentials are not configured.",
        }),
      };
    }

    if (username === validUsername && password === validPassword) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          message: "Login successful.",
        }),
      };
    }

    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        ok: false,
        message: "Invalid username or password.",
      }),
    };
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        ok: false,
        message: "Invalid request.",
      }),
    };
  }
};
