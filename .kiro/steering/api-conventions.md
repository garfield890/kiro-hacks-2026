---
inclusion: fileMatch
fileMatchPattern: "src/api/**"
---

# API Conventions

## REST Endpoint Structure
- Base path: `/api/v1`
- Resources use plural nouns: `/api/v1/users`, `/api/v1/orders`
- Nested resources: `/api/v1/users/:userId/orders`

## HTTP Methods
- `GET` — read/list resources (never mutate state)
- `POST` — create a new resource
- `PUT` — full replacement of a resource
- `PATCH` — partial update of a resource
- `DELETE` — remove a resource

## Response Shape
All responses follow this envelope:

```json
{
  "data": { },
  "meta": {
    "requestId": "uuid",
    "timestamp": "ISO8601"
  },
  "error": null
}
```

On error:
```json
{
  "data": null,
  "meta": { "requestId": "uuid", "timestamp": "ISO8601" },
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": []
  }
}
```

## Status Codes
- `200` OK
- `201` Created
- `204` No Content (successful DELETE)
- `400` Bad Request (validation failure)
- `401` Unauthorized
- `403` Forbidden
- `404` Not Found
- `409` Conflict
- `500` Internal Server Error

## Pagination
List endpoints accept `?page=1&pageSize=20` and return:
```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```
