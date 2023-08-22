import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import { join } from 'path';
import { Server } from "socket.io";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.setGlobalPrefix("api/v1");

  // const se = app.getHttpServer(); // this is for extend the Http request time to 3 minutes
  // se.timeout = 180000;

  const config = new DocumentBuilder()
    .setTitle('Demo Swagger')
    .setDescription('The Demo API description')
    .setVersion('1.0')
    .addBearerAuth(
      {
        description: ` Login in above api Get the token Try Again`,
        name: 'Authorization',
        bearerFormat: 'Bearer', // I`ve tested not to use this field, but the result was the same
        scheme: 'Bearer',
        type: 'http', // I`ve attempted type: 'apiKey' too
        in: 'Header'
      },
      'JWT-auth',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swaggerapi', app, document);
  const server = await app.listen(3000, '0.0.0.0', function () {
  });

  // const io = new Server({

  //   path: "/my-chat/",
  //   // allowRequest: (req, callback) => {
  //   //   const noOriginHeader = req.headers.origin === undefined;
  //   //   callback(null, noOriginHeader);
  //   // },
  //   // allowEIO3: true,
  //   cors: {
  //     origin: true,
  //     // methods: ['GET,POST,OPTIONS,DELETE,PUT'],
  //     // allowedHeaders: ["Access-Control-Allow-Headers", "Access-Control-Allow-Methods", "Access-Control-Allow-Origin"],
  //     credentials: true,
  //     // optionsSuccessStatus: 200,
  //   },

  // });
  // io.listen(3001);

}
bootstrap();
