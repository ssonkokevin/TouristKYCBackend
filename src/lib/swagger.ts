import { config } from "../config.js";

const swaggerServers = config.PUBLIC_BASE_URL
  ? [
      {
        url: `${config.PUBLIC_BASE_URL.replace(/\/$/, "")}/api/v1`,
        description: "Production",
      },
    ]
  : [
      {
        url: "/api/v1",
        description: "Local / VM backend (relative to current host)",
      },
    ];

export const swaggerSpec = {
  openapi: "3.0.3",
  info: {
    title: "Tourist KYC Portal API",
    description:
      "EMRG integration API for tourist SIM/KYC provisioning. " +
      "Resource endpoints require `Authorization: ApiKey <key>`; subscriber/document endpoints require a JWT bearer token.",
    version: "1.0.0",
    contact: {
      name: "EMRG Integration Support",
    },
  },
  servers: swaggerServers,
  tags: [
    { name: "Auth", description: "Authentication for dashboard users" },
    { name: "Resources", description: "SIM and MSISDN provisioning for external systems (API key auth)" },
    { name: "Subscribers", description: "Tourist subscriber records (JWT auth)" },
    { name: "Nationalities", description: "Reference data (JWT auth)" },
    { name: "Documents", description: "Subscriber document uploads (JWT auth)" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Dashboard JWT token returned by POST /auth/login",
      },
      apiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "Authorization",
        description: "`Authorization: ApiKey <INBOUND_API_KEY>`",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
          message: { type: "string" },
          issues: { type: "array", items: { type: "object" } },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          name: { type: "string" },
          role: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      SimInventory: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          imsi: { type: "string" },
          iccid: { type: "string" },
          type: { type: "string", enum: ["esim", "physical"] },
          category: { type: "string" },
          batchId: { type: "string", nullable: true },
          status: { type: "string", enum: ["available", "reserved", "provisioned", "assigned", "active", "suspended", "deactivated", "quarantined"] },
          reservedBy: { type: "string", nullable: true },
          reservedAt: { type: "string", format: "date-time", nullable: true },
          reservationExpiresAt: { type: "string", format: "date-time", nullable: true },
          provisionedAt: { type: "string", format: "date-time", nullable: true },
          providerConfirmationRef: { type: "string", nullable: true },
          notes: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      MsisdnPool: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          msisdn: { type: "string" },
          category: { type: "string" },
          status: { type: "string", enum: ["available", "reserved", "provisioned", "assigned", "active", "suspended", "deactivated"] },
          reservedBy: { type: "string", nullable: true },
          reservedAt: { type: "string", format: "date-time", nullable: true },
          reservationExpiresAt: { type: "string", format: "date-time", nullable: true },
          simInventoryId: { type: "string", format: "uuid", nullable: true },
          assignedSubscriberId: { type: "string", format: "uuid", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      AvailableSim: {
        type: "object",
        properties: {
          resource_id: { type: "string", format: "uuid" },
          imsi: { type: "string" },
          iccid: { type: "string" },
          type: { type: "string" },
          category: { type: "string" },
        },
      },
      AvailableMsisdn: {
        type: "object",
        properties: {
          resource_id: { type: "string", format: "uuid" },
          msisdn: { type: "string" },
          category: { type: "string" },
        },
      },
      Nationality: {
        type: "object",
        properties: {
          code: { type: "string" },
          code3: { type: "string", nullable: true },
          name: { type: "string" },
          flagEmoji: { type: "string", nullable: true },
          region: { type: "string", nullable: true },
        },
      },
      Subscriber: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          surname: { type: "string" },
          other_names: { type: "string" },
          gender: { type: "string", nullable: true },
          date_of_birth: { type: "string", format: "date", nullable: true },
          nationality_code: { type: "string" },
          id_type: { type: "string", nullable: true },
          passport_number: { type: "string" },
          passport_issue_date: { type: "string", format: "date", nullable: true },
          passport_expiry: { type: "string", format: "date", nullable: true },
          visa_type: { type: "string", nullable: true },
          visa_number: { type: "string", nullable: true },
          visa_issue_date: { type: "string", format: "date", nullable: true },
          visa_expiry_date: { type: "string", format: "date" },
          purpose_of_visit: { type: "string", enum: ["tourism", "business", "study", "transit", "medical", "other"], nullable: true },
          entry_point: { type: "string", nullable: true },
          arrival_date: { type: "string", format: "date", nullable: true },
          intended_duration_days: { type: "integer", nullable: true },
          accommodation: { type: "string", nullable: true },
          sim_inventory_id: { type: "string", format: "uuid", nullable: true },
          msisdn_id: { type: "string", format: "uuid", nullable: true },
          sim_inventory: { $ref: "#/components/schemas/SimInventory" },
          msisdn_pool: { type: "array", items: { $ref: "#/components/schemas/MsisdnPool" } },
          documents: {
            type: "object",
            description: "Uploaded documents keyed by DocumentType",
            additionalProperties: { $ref: "#/components/schemas/SubscriberDocument" },
            nullable: true,
          },
          registration_type: { type: "string", nullable: true },
          date_of_registration: { type: "string", format: "date-time", nullable: true },
          status: { type: "string", enum: ["active", "suspended", "deregistered"] },
          agent_id: { type: "string", nullable: true },
          agent_number: { type: "string", nullable: true },
          agent_name: { type: "string", nullable: true },
          registration_booth: { type: "string", nullable: true },
          registered_by: { type: "string", nullable: true },
          registered_at: { type: "string", format: "date-time" },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
          provider_sync_status: { type: "string", enum: ["queued", "already_registered"] },
        },
      },
      DocumentUploadResult: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          type: { type: "string" },
          url: { type: "string" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      SubscriberDocument: {
        type: "object",
        properties: {
          url: { type: "string" },
          uploadedAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
  paths: {
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Password login (break-glass for service accounts only)",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 6 },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Login successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    token: { type: "string" },
                    user: { $ref: "#/components/schemas/User" },
                  },
                },
              },
            },
          },
          "401": { description: "Invalid credentials", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/auth/google": {
      post: {
        tags: ["Auth"],
        summary: "Sign in with Google",
        description: "Exchanges a Google ID token for an app JWT. New users default to role 'viewer'.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["idToken"],
                properties: {
                  idToken: { type: "string", description: "Google OAuth ID token (credential)" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Login successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    token: { type: "string" },
                    user: { $ref: "#/components/schemas/User" },
                  },
                },
              },
            },
          },
          "401": { description: "Invalid or unverified token", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "403": { description: "Email domain is not authorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Self-service registration is disabled",
        description: "Self-service registration is disabled. Use POST /auth/google.",
        security: [],
        responses: {
          "410": { description: "Gone", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current authenticated user",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Current user", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Refresh JWT token",
        description: "Issues a new 24h JWT from a still-valid existing JWT. No dedicated refresh token is used.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "New JWT token",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    token: { type: "string" },
                    user: { $ref: "#/components/schemas/User" },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/resources/sim/available": {
      get: {
        tags: ["Resources"],
        summary: "List available SIMs (ICCID + IMSI pairs)",
        description: "Read-only. Returns a randomized selection (`ORDER BY RANDOM()`) to reduce contention. Does not reserve or mutate any state.",
        security: [{ apiKeyAuth: [] }],
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 1 } },
          { name: "type", in: "query", schema: { type: "string", enum: ["esim", "physical"] } },
          { name: "category", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "List of available SIM resources",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/AvailableSim" } },
                  },
                },
              },
            },
          },
          "401": { description: "Invalid API key", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/resources/msisdn/available": {
      get: {
        tags: ["Resources"],
        summary: "List available MSISDNs",
        description: "Read-only. Returns a randomized selection (`ORDER BY RANDOM()`) to reduce contention. Does not reserve or mutate any state.",
        security: [{ apiKeyAuth: [] }],
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 1 } },
          { name: "category", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "List of available MSISDN resources",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/AvailableMsisdn" } },
                  },
                },
              },
            },
          },
          "401": { description: "Invalid API key", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/resources/sim/{id}/provision": {
      post: {
        tags: ["Resources"],
        summary: "Provision a specific SIM",
        description: "Atomically claims the SIM and marks it `provisioned`. Call once the SIM is actually provisioned to the tourist's device. Retries with the same `provider_confirmation_ref` return the existing record (idempotent).",
        security: [{ apiKeyAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["provider_id", "provider_confirmation_ref"],
                properties: {
                  provider_id: { type: "string" },
                  provider_confirmation_ref: { type: "string" },
                  provisioned_at: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "SIM provisioned", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/SimInventory" } } } } } },
          "401": { description: "Invalid API key", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "SIM not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "409": { description: "SIM is no longer available or idempotency key mismatch", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "429": { description: "Too many requests", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/resources/msisdn/{id}/provision": {
      post: {
        tags: ["Resources"],
        summary: "Provision a specific MSISDN",
        description: "Atomically claims the MSISDN and marks it `provisioned`. Retries with the same `provider_confirmation_ref` return the existing record (idempotent).",
        security: [{ apiKeyAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["provider_id"],
                properties: {
                  provider_id: { type: "string" },
                  provider_confirmation_ref: { type: "string" },
                  provisioned_at: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "MSISDN provisioned", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/MsisdnPool" } } } } } },
          "401": { description: "Invalid API key", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "MSISDN not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "409": { description: "MSISDN is no longer available or idempotency key mismatch", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "429": { description: "Too many requests", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/resources/sim/{id}/release": {
      post: {
        tags: ["Resources"],
        summary: "Release a provisioned SIM",
        description: "Rolls a `provisioned` or `reserved` SIM back to `available`. Fails with 409 if the SIM is already assigned to a subscriber.",
        security: [{ apiKeyAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "SIM released", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/SimInventory" } } } } } },
          "401": { description: "Invalid API key", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "SIM not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "409": { description: "SIM is not in a releasable state or is already assigned", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "429": { description: "Too many requests", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/resources/msisdn/{id}/release": {
      post: {
        tags: ["Resources"],
        summary: "Release a provisioned MSISDN",
        description: "Rolls a `provisioned` or `reserved` MSISDN back to `available`. Fails with 409 if the MSISDN is already assigned to a subscriber.",
        security: [{ apiKeyAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "MSISDN released", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/MsisdnPool" } } } } } },
          "401": { description: "Invalid API key", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "MSISDN not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "409": { description: "MSISDN is not in a releasable state or is already assigned", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "429": { description: "Too many requests", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/resources/imsi/lookup": {
      get: {
        tags: ["Resources"],
        summary: "Look up a SIM by ICCID or IMSI",
        security: [{ apiKeyAuth: [] }],
        parameters: [
          { name: "imsi", in: "query", schema: { type: "string" } },
          { name: "iccid", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "SIM record", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/SimInventory" } } } } } },
          "400": { description: "imsi or iccid required", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { description: "Invalid API key", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "Resource not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/resources/msisdn/lookup": {
      get: {
        tags: ["Resources"],
        summary: "Look up an MSISDN record",
        security: [{ apiKeyAuth: [] }],
        parameters: [{ name: "msisdn", in: "query", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "MSISDN record", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/MsisdnPool" } } } } } },
          "401": { description: "Invalid API key", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "Resource not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/subscribers": {
      get: {
        tags: ["Subscribers"],
        summary: "List subscribers",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "status", in: "query", schema: { type: "string", enum: ["active", "suspended", "deregistered"] } },
          { name: "nationality", in: "query", schema: { type: "string" } },
          { name: "visa_expiry_from", in: "query", schema: { type: "string", format: "date" } },
          { name: "visa_expiry_to", in: "query", schema: { type: "string", format: "date" } },
          { name: "registered_from", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "registered_to", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "name", in: "query", schema: { type: "string" } },
          { name: "passport_number", in: "query", schema: { type: "string" } },
          { name: "msisdn", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Paginated subscriber list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/Subscriber" } },
                    total: { type: "integer" },
                    page: { type: "integer" },
                    limit: { type: "integer" },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      post: {
        tags: ["Subscribers"],
        summary: "Register a new subscriber (KYC push from external system)",
        description: "Called by the external provisioning system after it has provisioned the SIM/MSISDN to the tourist. Either `sim_inventory_id` + `msisdn_id` (from §2.1/§2.2) or `iccid` + `msisdn` may be used. The selected resources are atomically transitioned from `available`/`provisioned` to `assigned` and linked to the new subscriber. Retrying the same resource pair returns the existing record with `provider_sync_status: already_registered`.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["surname", "other_names", "nationality_code", "passport_number", "visa_expiry_date"],
                properties: {
                  surname: { type: "string" },
                  other_names: { type: "string" },
                  gender: { type: "string" },
                  date_of_birth: { type: "string", format: "date" },
                  nationality_code: { type: "string", minLength: 2, maxLength: 2 },
                  id_type: { type: "string" },
                  passport_number: { type: "string" },
                  passport_issue_date: { type: "string", format: "date" },
                  passport_expiry: { type: "string", format: "date" },
                  visa_type: { type: "string" },
                  visa_number: { type: "string" },
                  visa_issue_date: { type: "string", format: "date" },
                  visa_expiry_date: { type: "string", format: "date" },
                  purpose_of_visit: { type: "string", enum: ["tourism", "business", "study", "transit", "medical", "other"] },
                  entry_point: { type: "string" },
                  arrival_date: { type: "string", format: "date" },
                  intended_duration_days: { type: "integer" },
                  accommodation: { type: "string" },
                  sim_inventory_id: { type: "string", format: "uuid" },
                  msisdn_id: { type: "string", format: "uuid" },
                  iccid: { type: "string" },
                  msisdn: { type: "string" },
                  date_of_registration: { type: "string", format: "date" },
                  registration_type: { type: "string" },
                  registered_by: { type: "string" },
                  registration_booth: { type: "string" },
                  agent_id: { type: "string" },
                  agent_number: { type: "string" },
                  agent_name: { type: "string" },
                  subscriber_photo_url: { type: "string" },
                  passport_bio_page_url: { type: "string" },
                  visa_page_url: { type: "string" },
                  application_form_url: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Subscriber created", content: { "application/json": { schema: { $ref: "#/components/schemas/Subscriber" } } } },
          "200": { description: "Subscriber already registered for this resource pair", content: { "application/json": { schema: { $ref: "#/components/schemas/Subscriber" } } } },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "SIM or MSISDN not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "409": { description: "SIM or MSISDN not available or already assigned", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/subscribers/{id}": {
      get: {
        tags: ["Subscribers"],
        summary: "Get a subscriber by ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Subscriber record", content: { "application/json": { schema: { $ref: "#/components/schemas/Subscriber" } } } },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "Subscriber not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      patch: {
        tags: ["Subscribers"],
        summary: "Update a subscriber",
        description: "Status, sim_inventory_id, and msisdn_id cannot be changed via this endpoint.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Subscriber" },
            },
          },
        },
        responses: {
          "200": { description: "Subscriber updated", content: { "application/json": { schema: { $ref: "#/components/schemas/Subscriber" } } } },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "Subscriber not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/subscribers/{id}/suspend": {
      post: {
        tags: ["Subscribers"],
        summary: "Suspend a subscriber",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["reason"],
                properties: {
                  reason: { type: "string", enum: ["visa_expired", "manual_review", "fraud_suspected", "payment_issue", "other"] },
                  reason_note: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Subscriber suspended", content: { "application/json": { schema: { $ref: "#/components/schemas/Subscriber" } } } },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "Subscriber not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/subscribers/{id}/deregister": {
      post: {
        tags: ["Subscribers"],
        summary: "Deregister a subscriber",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["reason"],
                properties: {
                  reason: { type: "string", enum: ["visa_expired_deregistered", "lost_card", "change_of_number", "customer_not_interested", "voluntary_deregistration", "fraud_suspected", "other"] },
                  reason_note: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Subscriber deregistered", content: { "application/json": { schema: { $ref: "#/components/schemas/Subscriber" } } } },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "Subscriber not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/nationalities": {
      get: {
        tags: ["Nationalities"],
        summary: "List nationalities",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Nationalities list", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Nationality" } } } } },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/documents/subscribers/{id}/{type}": {
      post: {
        tags: ["Documents"],
        summary: "Upload a subscriber document",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "type", in: "path", required: true, schema: { type: "string", enum: ["application_form", "passport_bio_page", "visa_page", "subscriber_photo"] } },
        ],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file"],
                properties: {
                  file: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Document uploaded", content: { "application/json": { schema: { $ref: "#/components/schemas/DocumentUploadResult" } } } },
          "400": { description: "Invalid document type or missing file", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
  },
};

export function swaggerHtml(specUrl: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tourist KYC API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: ${JSON.stringify(specUrl)},
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis],
      layout: "BaseLayout",
    });
  </script>
</body>
</html>`;
}
