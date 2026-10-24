import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller()
export class AppController {
  @Get()
  getRoot(@Res() res: Response) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mess Meal Manager API — NestJS</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 36px;
      max-width: 520px;
      width: 100%;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
      text-align: center;
    }
    .badge {
      display: inline-block;
      background: #e11d48;
      color: white;
      font-size: 13px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 9999px;
      margin-bottom: 16px;
    }
    h1 {
      margin: 0 0 12px 0;
      font-size: 26px;
      font-weight: 700;
    }
    p {
      color: #94a3b8;
      font-size: 15px;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .links {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    a.btn {
      display: inline-block;
      background: #3b82f6;
      color: white;
      text-decoration: none;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 600;
      transition: background 0.2s;
    }
    a.btn:hover {
      background: #2563eb;
    }
    a.btn-secondary {
      background: #334155;
      color: #f1f5f9;
    }
    a.btn-secondary:hover {
      background: #475569;
    }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">NestJS Active & Running</span>
    <h1>🥘 Mess Meal Manager API</h1>
    <p>High-performance backend API powered by <strong>NestJS</strong>, <strong>Prisma ORM</strong>, and <strong>Neon PostgreSQL</strong>.</p>
    <div class="links">
      <a class="btn" href="/api/docs">Explore Interactive Swagger API Docs</a>
      <a class="btn btn-secondary" href="/api/openapi.json" target="_blank">Raw OpenAPI Specification JSON</a>
      <a class="btn btn-secondary" href="/api/config">System Configuration (/api/config)</a>
    </div>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  }
}
