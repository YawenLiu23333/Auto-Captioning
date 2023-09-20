// Import necessary dependencies
const express = require('express');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');
// Initialize Express app
const app = express();

// use port 3000
var port = 3000;

// Define middleware to parse JSON requests
app.use(bodyParser.json());

// Define API endpoints using Express Router
const videosRouter = require('./routes/videos');
app.use('/videos', videosRouter);
// Define Swagger API documentation options
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Automated caption api',
      version: '1.0.0',
      description: 'API documentation for automated caption',
    },
    consumes: ['multipart/form-data']
  },
  apis: ['./routes/*.js', 'app.js'],
};
//test
//Aaron Test
// Initialize Swagger API documentation
const swaggerSpec = swaggerJSDoc(swaggerOptions);

// Serve Swagger UI for API documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Start listening to port
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
