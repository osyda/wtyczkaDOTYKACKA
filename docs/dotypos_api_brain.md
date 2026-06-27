# DOTYPOS / DOTYKAČKA API v2 — Claude Code Brain

**Prepared for:** WordPress / WooCommerce / Orderable → Dotypos POS integration  
**Context:** Restauracja Mammarosa / online ordering / POS order injection / product sync / addon mapping  
**Generated:** 2026-06-27  
**Source docs:** https://docs.api.dotypos.com/  
**Important:** This file is a practical, paraphrased implementation brain. It is not a verbatim copy of the documentation. Always verify edge cases against the live docs before production deployment.

---

## 0. Core purpose of Dotypos API v2

Dotypos API v2 allows an external application to:

1. Read and manage Dotypos cloud entities: products, categories, customers, warehouses, tables, branches, orders, order items, taxes, suppliers, employees, etc.
2. Generate reports, especially base sales reports.
3. Send POS Actions directly to a branch device, including creating/opening/issuing/paying orders.
4. Register webhooks for selected entity updates.
5. Use local OMS API for advanced local-network order workflows / KDS-style integrations, currently marked as development preview.

For WooCommerce online ordering, the most important parts are:

- Authorization / Connector v2
- Branch
- Product
- Product Customization
- Category
- Customer, optional
- Order and Order Item, mostly for reading
- POS Actions, for creating orders on POS
- Payment methods enum
- Webhook, optional for sync
- ETags, paging, filtering, sorting, errors

---

## 1. Documentation map

Official docs navigation discovered from https://docs.api.dotypos.com/:

### Guides

- Introduction to API v2
- Getting started
- Authorization
- Delivery Notes Integrations

### API Reference / General

- Data types
- Validation
- Prices
- Schema
- Flags
- ETags
- ETag examples
- Filtering
- Sorting
- Paging
- Methods
- HTTP Status Codes

### Enums

- Payment methods
- Units
- Order status

### Entity pages

- Attendance
- Branch
- Category
- Cloud
- Course
- Customer
- Customer Account
- Customer Account Log
- Daily Menu
- Daily Menu Product
- Delivery Note
- Discount group
- EET subject
- Employee
- Money log
- Order
- Order item
- Product
- Product Customization
- Product Ingredient
- Reservation
- Stock Packaging
- Supplier
- Table
- Tag
- Tax / VAT rates
- Warehouse
- Warehouse Branch

### POS Actions

- POS Actions
- Developer Mode
- Breaking changes

### OMS API

- Introduction to OMS API

### Others

- Reports
- Base Sales Report
- Release notes
- Breaking changes
- Webhook
- Third-party libraries

### Migration

- Migrating from API v1
- Migration connector endpoint
- API v1 Services: Branch, Category, Customer, Employee, OAuth2 Login, POS action, Product, Reservation, Sale, Stock, Supplier, Tableseat, Tag, Warehouse.

---

## 2. Base URLs and key constants

```txt
API base:              https://api.dotykacka.cz/v2
Connector v2 page:     https://admin.dotykacka.cz/client/connect/v2
Access token endpoint: https://api.dotykacka.cz/v2/signin/token
```

Standard authenticated API request header:

```http
Authorization: Bearer {ACCESS_TOKEN}
Accept: application/json
Content-Type: application/json
```

For access-token exchange:

```http
Authorization: User {REFRESH_TOKEN}
Content-Type: application/json
```

For Connector v2, submit a browser form as `application/x-www-form-urlencoded`; it is not a normal JSON REST endpoint.

---

## 3. Getting started / app registration

To use API v2, the integrator needs a registered Client Application.

Expected credentials after registration:

```txt
CLIENT_ID
CLIENT_SECRET
TEST_LICENSE_KEY, usually for test cloud creation
```

Recommended internal settings to store per connected Dotypos account/cloud:

```txt
client_id
client_secret        # server-side only, never expose in frontend JS except temporary internal test pages
refresh_token        # long-term secret
cloud_id
branch_id
access_token         # short-lived cache
access_token_expires # local expiry estimate, but refresh defensively on 401/403 expired
```

Production rule:

- Use Connector v2 POST + HMAC flow.
- Do not use old GET connector with `client_secret` in URL.
- Store secrets encrypted or at least outside public WordPress options where possible.

---

## 4. Authorization flow — Connector v2

### 4.1 Goal

Obtain `refresh_token` and `cloud_id` once. Later use refresh token to request short-lived access tokens.

### 4.2 Connector v2 request

Open a browser flow by submitting form data to:

```http
POST https://admin.dotykacka.cz/client/connect/v2
Content-Type: application/x-www-form-urlencoded
```

Required fields:

```txt
client_id     = Dotypos client application ID
timestamp     = current Unix timestamp in seconds
signature     = HMAC-SHA256(client_secret, string(timestamp)), hex encoded
scope         = *
redirect_uri  = callback URL in your app/plugin
state         = optional but strongly recommended CSRF value
```

Timestamp details:

- Use UTC Unix timestamp in seconds.
- Keep system clock synchronized with NTP.
- If timestamp is outside Dotypos tolerance, connection fails.

Signature details:

```txt
message = timestamp as string
key     = client_secret
algo    = HMAC-SHA256
output  = lowercase hex, 64 chars
```

Callback response query params:

```txt
token   = Refresh Token
cloudid = selected Cloud ID
state   = CSRF state if supplied
```

Implementation notes for WordPress:

- Admin clicks “Connect Dotypos”.
- Plugin generates `state` and stores it transient/session.
- Plugin creates an auto-submitting POST form to Dotypos Connector v2.
- Dotypos redirects back to plugin callback URL.
- Plugin verifies `state`, stores `refresh_token` and `cloud_id`.
- Plugin then calls `POST /v2/signin/token` with `_cloudId`.

### 4.3 Access token exchange

```http
POST https://api.dotykacka.cz/v2/signin/token
Authorization: User {REFRESH_TOKEN}
Content-Type: application/json

{
  "_cloudId": 398610248
}
```

Response:

```json
{
  "accessToken": "eyJ..."
}
```

Special case: empty JSON body `{}` returns an access token usable only for listing clouds. For normal use, always pass `_cloudId`.

Access token is short-lived, commonly treated as roughly one hour, but do not depend on exact lifetime. Refresh on expiry or on appropriate 401/403 errors.

---

## 5. General API behavior

### 5.1 Data types

Timestamps accepted in filters and bodies:

```txt
Unix milliseconds since epoch
ISO 8601 UTC: YYYY-MM-DDThh:mm:ss.SSSZ
ISO 8601 with zone: YYYY-MM-DDThh:mm:ss.SSS+01:00
```

Important number behavior:

- In normal entity API responses, many numeric fields may be represented as strings for compatibility with JavaScript long-number limits.
- POS Actions responses are an exception: integers in POS Action responses are not stringified.
- When comparing IDs in PHP/JS, normalize carefully. Use strings for storage when precision matters.

### 5.2 Price rules

- Prices are double precision internally.
- Do not round price values when creating/updating entities.
- Use precise `priceWithoutVat` / `priceWithVat` calculations to avoid report rounding drift.
- For POS Actions, `manual-price` can override a line price when appropriate, e.g. variable delivery fee.

### 5.3 Schema reading convention

Schema fields often show:

```txt
fieldName dataType?
```

Meaning:

- `?` means optional.
- No `?` means required unless the field has special notes.
- Internal reference IDs usually start with `_`, e.g. `_cloudId`, `_categoryId`, `_productId`, `_customerId`.
- Field docs list supported filter groups and sorting support.

### 5.4 Flags

Flags are bit fields stored as decimal numbers.

Example logic:

```php
function has_flag(int $flags, int $bit): bool {
    return ($flags & (1 << $bit)) !== 0;
}

function set_flag(int $flags, int $bit): int {
    return $flags | (1 << $bit);
}

function clear_flag(int $flags, int $bit): int {
    return $flags & ~(1 << $bit);
}
```

Critical rule: when PATCH/PUT touches flags, preserve all existing bits unless intentionally changing them. Sending only one bit value can accidentally clear all other flags.

### 5.5 ETags

Entity endpoints return an `ETag` header. Use it to avoid stale writes.

Read caching:

```http
GET /v2/clouds/{cloudId}/products
If-None-Match: "previous-etag"
```

Possible result:

```txt
304 Not Modified
```

Safe update:

```http
PATCH /v2/clouds/{cloudId}/products/{productId}
If-Match: "etag-from-get"
```

Important:

- GET supports `If-None-Match`.
- POST does not need ETag.
- PUT/PATCH normally require `If-Match`.
- DELETE currently ignores ETag temporarily, but code should be ready for future stricter behavior.
- List endpoints calculate ETag for the current returned list/page.
- When updating a list with PUT/PATCH, keep IDs/order consistent with the GET response used to obtain the ETag.

### 5.6 Filtering

Generic format:

```txt
filter=attribute|operation|value;attribute2|operation|value
```

Operations:

```txt
eq    equals
ne    not equals
gt    greater than
gteq  greater than or equal
lt    less than
lteq  less than or equal
like  case-insensitive contains
in    value in set
bin   bit included
bex   bit excluded
```

Examples:

```txt
filter=display|eq|true
filter=name|like|pizza
filter=externalId|in|WC-1,WC-2
filter=deleted|eq|false
```

By default, list endpoints may exclude deleted items unless `deleted` is explicitly filtered.

### 5.7 Sorting

Generic format:

```txt
sort=attribute,attribute2,-attribute3
```

Examples:

```txt
sort=name
sort=-name
sort=-created,name
```

### 5.8 Paging

Generic query params:

```txt
page=1
limit=100
```

Defaults:

- `page`: 1
- `limit`: 20
- max `limit`: 100

Typical response shape:

```json
{
  "currentPage": 1,
  "perPage": 100,
  "totalItemsOnPage": 100,
  "totalItemsCount": 245,
  "firstPage": 1,
  "lastPage": 3,
  "nextPage": 2,
  "prevPage": null,
  "data": []
}
```

Some entities may return null for total count / last page. Robust loop:

```pseudo
page = 1
while true:
  res = GET endpoint?page=page&limit=100
  if HTTP 404 and compatibility mode: break/no data
  process res.data
  if res.nextPage is null: break
  page = res.nextPage
```

### 5.9 Common HTTP methods

Generic entity endpoint patterns:

```http
GET     /v2/clouds/{cloudId}/{entity}
GET     /v2/clouds/{cloudId}/{entity}/{entityId}
POST    /v2/clouds/{cloudId}/{entity}
PUT     /v2/clouds/{cloudId}/{entity}
PUT     /v2/clouds/{cloudId}/{entity}/{entityId}
PATCH   /v2/clouds/{cloudId}/{entity}/{entityId}
DELETE  /v2/clouds/{cloudId}/{entity}/{entityId}
OPTIONS /v2/clouds/{cloudId}/{entity}
OPTIONS /v2/clouds/{cloudId}/{entity}/{entityId}
```

Many entity pages follow this same CRUD structure, with entity-specific availability.

### 5.10 HTTP status codes to handle

```txt
200 OK
201 Created
304 Not Modified
400 Bad request / validation error
401 Authentication problem, often missing/invalid Authorization or invalid refresh token
403 Authorization problem, expired/invalid access token, no permission, license issue
404 Not found or no matching entities in older compatibility behavior
405 Method not allowed
409 Conflict / versionDate verification issue
412 ETag precondition failed
428 Missing If-Match for endpoints requiring it
429 Too many requests
500 Internal error
501 Not implemented
```

For 401/403, inspect `reason` if provided. Known reason examples include invalid auth header, invalid refresh token, invalid/expired access token, cloud forbidden, domain forbidden, license upgrade required.

---

## 6. Enums

### 6.1 Payment methods

Common payment method IDs usable in POS Actions with payment:

```txt
Cash                    900000001
Credit card             900000002
Check                   900000003
Meal voucher            900000004
Bank transfer           900000009
Electronic food voucher 900000010
Gift card / Voucher     900000011
Write-off               900000012
SumUp                   900000014
Uber Eats               900000016
Vyzvednisi Online       900000017
QR code                 900000018
Online                  900000019
Room                    900000020
Cash machine            900000021
Multisport              900000022
Qerko                   901000001
Corrency                901000002
Bolt Food               901000003
Wolt                    901000004
Speedlo                 901000005
Choice QR               901000006
Previo                  901000007
Foodora                 901000008
Foodora cash            901000009
Slevomat                901000010
Zlavomat                901000011
Pyszne                  901000012
Glovo                   901000013
Apetigo                 901000014
Bistro.sk               901000015
```

Important: the list is not guaranteed complete. Code must tolerate unknown payment method IDs in responses.

For Mammarosa:

- Payment on delivery / pickup: usually send `order/create` and let staff close/pay at POS.
- Online card/prepaid: consider `order/create-issue-pay` with `payment-method-id = 900000019` only after testing fiscal/legal workflow.

### 6.2 Units

Common unit names:

```txt
Piece
Milligram, Decagram, Gram, Kilogram, Pound, Ounce, Quintal, Tonne
Millimeter, Centimeter, Meter, Kilometer, Inch, Mile
SquareMeter, SquareFoot
Milliliter, Deciliter, Centiliter, Liter, UsGallon, UkGallon, Hectoliter, CubicMeter, CubicFoot
Second, Minute, Hour, Day
Points
```

### 6.3 Order status

Status names / parameters:

```txt
New                 new
Parked              parked
Ready to pickup     ready_to_pickup
Ready for delivery  ready_for_delivery
On delivery         on_delivery
Delivery failed     delivery_failed
Canceled            canceled
Closed              closed
Unknown             fallback
```

Transitions mentioned by docs include:

```txt
parked -> ready_for_delivery via prepare_for_delivery
parked -> ready_to_pickup via prepare_to_pickup
ready_to_pickup -> closed via complete_pickup
ready_to_pickup -> canceled via cancel_pickup
ready_for_delivery -> on_delivery via start_delivery
ready_for_delivery -> canceled via cancel_delivery
on_delivery -> closed via complete_delivery
on_delivery -> canceled via cancel_delivery
```

---

## 7. Entity brain

### 7.1 Branch

Purpose: Dotypos branch / location. Required for POS Actions.

Endpoint:

```http
GET /v2/clouds/{cloudId}/branches
GET /v2/clouds/{cloudId}/branches/{branchId}
```

Important fields:

```txt
id
_cloudId
name
display
deleted
features
flags
created
versionDate
```

Branch flags include bits for substituting/replaced branch, hide stock, hide prices, free license.

Implementation:

- Fetch branches after authorization.
- If only one branch, auto-select it.
- Store branch ID in WordPress settings.
- POS Actions require branch ID and target device must be on.

### 7.2 Cloud

Purpose: user/company cloud context.

Use cases:

- If access token requested without `_cloudId`, allowed mostly to list clouds.
- Normal API usage needs access token bound to a specific cloud.

### 7.3 Category

Purpose: product grouping/menu categories.

Endpoint pattern:

```http
GET /v2/clouds/{cloudId}/categories
GET /v2/clouds/{cloudId}/categories/{categoryId}
```

Implementation:

- Use categories for WooCommerce category sync.
- Preserve Dotypos category ID in WooCommerce term meta.
- Avoid deleting categories automatically unless explicitly configured.

### 7.4 Product

Purpose: sellable/menu item.

Main endpoints:

```http
GET    /v2/clouds/{cloudId}/products
GET    /v2/clouds/{cloudId}/products/{productId}
POST   /v2/clouds/{cloudId}/products
PUT    /v2/clouds/{cloudId}/products
PUT    /v2/clouds/{cloudId}/products/{productId}
PATCH  /v2/clouds/{cloudId}/products/{productId}
DELETE /v2/clouds/{cloudId}/products/{productId}
```

Important read query:

```http
GET /v2/clouds/{cloudId}/products?include=customizations,ingredients&page=1&limit=100
```

The `include` parameter can embed `customizations` and `ingredients` when permissions allow.

Important fields for WooCommerce mapping:

```txt
id
_cloudId
_categoryId
name
alternativeName
subtitle
description
translatedName
translatedDescription
priceWithVat
priceWithoutVat
priceWithVatB/C/D/E
currency
unit
externalId
plu
ean
allergens
tags
features
hexColor
imageUrl
stockDeduct
stockOverdraft
display
deleted
flags
requiresPriceEntry
preparationDuration
versionDate
```

Product flags relevant to online ordering:

```txt
SHORTCUT
REQUIRES_QUANTITY_ENTRY
REQUIRES_PRICE_ENTRY
TIMEABLE
MANUAL_SALE_ITEM
FISCALIZATION_DISABLED
ASSEMBLED_ITEM
TAKE_AWAY
TAKE_AWAY_ITEM
SPECIAL
WITH_CUSTOMIZATIONS
EXEMPTED_VAT
```

Mammarosa implementation:

- Use product `id` as primary Dotypos product ID.
- Store mapping in WooCommerce product meta, e.g. `_dotypos_product_id`.
- Store `versionDate` / ETag data for sync diagnostics.
- If Dotypos product `display=false` or `deleted=true`, hide/deactivate product in online menu.
- Use `priceWithVat` for customer-visible WooCommerce price unless a deliberate VAT calculation is configured.
- Do not round internal calculations more than necessary.
- Treat `WITH_CUSTOMIZATIONS` as a signal that addons/customizations need mapping.

### 7.5 Product Customization

Purpose: addon/customization group attached to a product, e.g. pizza extras, variants, required choices.

Endpoints:

```http
GET    /v2/clouds/{cloudId}/product-customizations
GET    /v2/clouds/{cloudId}/product-customizations/{productCustomizationId}
POST   /v2/clouds/{cloudId}/product-customizations
PUT    /v2/clouds/{cloudId}/product-customizations
PUT    /v2/clouds/{cloudId}/product-customizations/{productCustomizationId}
PATCH  /v2/clouds/{cloudId}/product-customizations/{productCustomizationId}
DELETE /v2/clouds/{cloudId}/product-customizations/{productCustomizationId}
```

Important fields:

```txt
id
_cloudId
_categoryId
_productId
_defaultProductIds
name
translatedName
minSelected
maxSelected
sortOrder
priceLevel
deleted
flags
versionDate
```

Price levels:

```txt
B, C, D, E
```

Note: price levels are applicable in Poland according to docs.

Customization flags:

```txt
DEFAULT_SELECTION_GRATIS
ONE_CHEAPEST_ITEM_GRATIS
ALL_ITEMS_GRATIS
```

Critical WooCommerce mapping:

A customization is not just text. For POS Actions, send each chosen addon as:

```json
{
  "product-customization-id": 123,
  "product-id": 456,
  "qty": 1,
  "manual-price": 4.50
}
```

Where:

- `product-customization-id` = ID of customization group.
- `product-id` = Dotypos product ID of chosen customization product/addon.
- `qty` = quantity.
- `manual-price` optional.

Do not only put addons in order note if POS stock/price/kitchen print needs them as items.

### 7.6 Product Ingredient

Purpose: product composition / ingredients. Useful for stock/recipes, not the main online ordering path.

Implementation:

- Read if you need ingredient display or stock deduction details.
- Do not confuse ingredients with customer-facing customizations/addons.

### 7.7 Customer

Purpose: customer record in Dotypos.

Endpoints:

```http
GET    /v2/clouds/{cloudId}/customers
GET    /v2/clouds/{cloudId}/customers/{customerId}
POST   /v2/clouds/{cloudId}/customers
PUT    /v2/clouds/{cloudId}/customers
PUT    /v2/clouds/{cloudId}/customers/{customerId}
PATCH  /v2/clouds/{cloudId}/customers/{customerId}
DELETE /v2/clouds/{cloudId}/customers/{customerId}?anonymize=false
```

Important fields:

```txt
id
_cloudId
_discountGroupId
_sellerId
firstName
lastName
companyName
companyId       # PL: REGON
vatId           # PL: NIP
email
phone
addressLine1
addressLine2
city
zip
country
barcode
points
tags
note
internalNote
display
deleted
flags
created
expireDate
versionDate
```

Validation note:

- At least one of `firstName`, `lastName`, `companyName` should contain a non-blank value.
- For PL business customers, use `vatId` for NIP; `companyId` is REGON.

Mammarosa implementation decision:

- Phase 1: put customer name/phone/address in POS Action `note` for simplicity.
- Phase 2: create/update Dotypos customer and send `customer-id` in POS Actions.
- Use WooCommerce customer ID or email/phone as `externalId` if creating customers.

### 7.8 Order

Purpose: read Dotypos orders. Creating live POS orders should usually be done through POS Actions, not normal Order entity endpoints.

Read endpoints:

```http
GET /v2/clouds/{cloudId}/orders
GET /v2/clouds/{cloudId}/orders/{orderId}
```

Useful include:

```txt
include=orderItems,moneyLogs
```

Important fields:

```txt
id
_cloudId
_branchId
_customerId
_employeeId
_tableId
_sourceOrderId
created
updated
completed
canceledDate
currency
documentNumber
documentType
externalId
note
paid
parked
status
itemCount
totalValueRounded
tipAmount
tags
flags
versionDate
```

Document types include receipt, invoice, invoice from receipts, corrective invoice, external invoice payment, cash in, cash out.

Mammarosa implementation:

- Use `externalId` like `WC-12345` to map POS order to WooCommerce order.
- Use read endpoints for diagnostics/reporting, not as the primary way to create an online order.

### 7.9 Order item

Purpose: read order line items.

Endpoints:

```http
GET /v2/clouds/{cloudId}/order-items
GET /v2/clouds/{cloudId}/order-items/{orderItemId}
```

Important fields:

```txt
id
_cloudId
_branchId
_orderId
_productId
_categoryId
_customerId
_employeeId
_courseId
alternativeName
billedUnitPriceWithVat
billedUnitPriceWithoutVat
quantity / count fields
canceledDate
customizations
```

Use order item data to debug whether customizations/addons made it into POS.

### 7.10 Table

Purpose: POS tables.

Endpoints:

```http
GET /v2/clouds/{cloudId}/tables
GET /v2/clouds/{cloudId}/tables/{tableId}
```

Important fields:

```txt
id
_cloudId
_branchId
_tableGroupId
_sellerId
name
locationName
enabled
display
seats
type
tags
positionX
positionY
rotation
versionDate
```

For online delivery/pickup, `table-id` is optional. If POS workflow requires a virtual table for online orders, configure one and store its table ID.

### 7.11 Tax / VAT rates

Purpose: VAT rate definitions.

Endpoint pattern:

```http
GET    /v2/clouds/{cloudId}/taxes
GET    /v2/clouds/{cloudId}/taxes/{taxId}
POST   /v2/clouds/{cloudId}/taxes
PUT    /v2/clouds/{cloudId}/taxes
PUT    /v2/clouds/{cloudId}/taxes/{taxId}
PATCH  /v2/clouds/{cloudId}/taxes/{taxId}
DELETE /v2/clouds/{cloudId}/taxes/{taxId}
```

Implementation:

- Usually read-only for WooCommerce sync.
- Be careful with product VAT consistency.
- Do not create/update tax rates unless fully understood.

### 7.12 Warehouse

Purpose: warehouses, stock quantities, stock operations.

Important product stock endpoint:

```http
GET /v2/clouds/{cloudId}/warehouses/{warehouseId}/products
GET /v2/clouds/{cloudId}/warehouses/{warehouseId}/products/{productId}
```

Extended product stock fields:

```txt
_warehouseId
purchasePriceWithoutVat
stockQuantityStatus
stockStatusVersiondate
```

Stockup endpoint:

```http
POST /v2/clouds/{cloudId}/warehouses/{warehouseId}/stockups
```

Stockup body concept:

```json
{
  "_supplierId": 123,
  "_closeDeliveryNoteIds": [111, 222],
  "currency": "PLN",
  "invoiceNumber": "FV/1/2026",
  "note": "Dostawa",
  "updatePurchasePrice": true,
  "items": [
    {
      "_productId": 456,
      "externalId": "EXT-456",
      "purchasePrice": 10.50,
      "quantity": 5,
      "sellPrice": 20.00
    }
  ]
}
```

One of `_productId` or `externalId` is required per item.

For Mammarosa online ordering:

- Stock sync is optional.
- Do not block online orders by stock unless Dotypos stock is reliable.

### 7.13 Delivery Note

Purpose: upload/filter delivery notes imported to warehouse app. Mostly for suppliers/warehouse processes, not normal customer online ordering.

Important:

- Delivery Notes Integrations are separate from restaurant online orders.
- Do not use Delivery Notes for WooCommerce customer orders.

### 7.14 Other entities summary

These follow mostly generic entity patterns:

```txt
Attendance             employee attendance / time tracking
Course                 kitchen course/serving course definitions
Customer Account       loyalty/customer account balances
Customer Account Log   account transaction log
Daily Menu             daily menu definitions
Daily Menu Product     products assigned to daily menu
Discount group         customer/product discount grouping
EET subject            fiscal/tax subject concept, country dependent
Employee               POS employee/seller/user
Money log              cash in/out and money movement records
Reservation            reservations, statuses and customer/table data
Stock Packaging        packaging/stock packaging entity
Supplier               suppliers
Tag                    tags for grouping/filtering entities
Warehouse Branch       relationship between branch and warehouse
```

Use these only when needed. For basic WooCommerce → POS, do not overbuild around them.

---

## 8. POS Actions — most important for online orders

### 8.1 Endpoint

```http
POST /v2/clouds/{cloudId}/branches/{branchId}/pos-actions
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json
```

Body is an array of action requests or a request schema accepted by docs. For implementation, test exact accepted wrapping in Postman against the current API and POS app version.

### 8.2 Operational behavior

- Sends action to a specific branch device.
- Branch device / POS must be turned on and connected.
- If request has no custom webhook, default synchronous-ish response path is used.
- If default response path is used and POS does not process in about 21 seconds, HTTP 404 may be returned.
- Default webhook path is limited to one running request per same user/client/cloud/branch combination; exceeding it returns HTTP 429.
- HTTP 200 does not mean business success. Inspect response `code` field.
- POS Action response integer values are not necessarily stringified.

### 8.3 POS Action result codes to handle

Common examples:

```txt
0       CODE_OK
100     CODE_OTHER
1001    REQUEST_ERROR
1002    CONFIGURATION_ERROR
1003    MISSING_ACTION
1004    UNKNOWN_ACTION
1005    DATA_FORMAT_ERROR
1006    LICENSE_ERROR
1007    EXPIRED_REQUEST
1008    USER_NOT_FOUND
1009    ACTION_NOT_ALLOWED_FOR_COUNTRY
1999    SERVER_ERROR
2001    ORDER_LOCKED
2002    ORDER_NOT_FOUND
2003    ORDER_PAYMENT_METHOD_NOT_FOUND
2004    ORDER_PAID
10001   CUSTOMIZATION_NOT_FOUND
10002   CUSTOMIZATION_CATEGORY_NOT_FOUND
10003   PRODUCT_NOT_FOUND while working with customizations
```

Always log:

```txt
http_status
pos_action_code
external-id
request body redacted
response body
cloud_id
branch_id
timestamp
```

### 8.4 Basic item shape for orders

```json
{
  "id": 123456,
  "qty": 1,
  "note": "bez cebuli",
  "discount-percent": 0,
  "manual-price": 42.00,
  "tags": ["WWW"],
  "course-id": null,
  "customizations": [
    {
      "product-customization-id": 111,
      "product-id": 222,
      "qty": 1,
      "manual-price": 5.00
    }
  ],
  "take-away": true
}
```

Fields:

```txt
id                  Dotypos _productId
qty                 quantity
note                item note
manual-price        optional price override
manual-points       optional points override
tags                optional tags
course-id           course ID if used
take-away           takeaway flag
customizations      array of selected addon products attached to customization group
```

### 8.5 Create open order

Best default for WooCommerce cash/card-at-counter ordering:

```json
{
  "action": "order/create",
  "customer-id": null,
  "discount-percent": 0,
  "table-id": null,
  "user-id": null,
  "note": "WWW | Odbiór osobisty | Jan Kowalski | tel. 500000000",
  "external-id": "WC-12345",
  "items": [],
  "lock": false
}
```

Use this when:

- Customer pays on pickup/delivery.
- Staff should review/close/fiscalize at POS.
- You want safest first production rollout.

### 8.6 Add item to existing order

```json
{
  "action": "order/add-item",
  "order-id": 987,
  "items": [],
  "lock": false
}
```

Use only if creating order and adding items separately is needed. For WooCommerce, prefer one `order/create` with items unless testing shows POS workflow requires split calls.

### 8.7 Issue order

```json
{
  "action": "order/issue",
  "order-id": 987,
  "print-config": {},
  "print-email": null,
  "print-type": null,
  "take-away": true
}
```

Caution:

- Country restrictions exist in docs for some actions.
- Optional staff notifications for issued orders may require Dotypos to enable the feature for the API application.

### 8.8 Pay issued order

```json
{
  "action": "order/pay",
  "order-id": 987,
  "payment-method-id": 900000019
}
```

Use after order is issued, when implementing online paid flow.

### 8.9 Create and issue order

```json
{
  "action": "order/create-issue",
  "customer-id": null,
  "discount-percent": 0,
  "table-id": null,
  "user-id": null,
  "note": "WWW | zamówienie opłacone? nie",
  "external-id": "WC-12345",
  "items": [],
  "payment-method-id": 900000019,
  "take-away": true
}
```

Docs show `payment-method-id` in this action shape. Test exact behavior before relying on it.

### 8.10 Create, issue and pay order

```json
{
  "action": "order/create-issue-pay",
  "customer-id": null,
  "discount-percent": 0,
  "table-id": null,
  "user-id": null,
  "note": "WWW | opłacone online | WC-12345",
  "external-id": "WC-12345",
  "items": [],
  "payment-method-id": 900000019,
  "print-append": "Zamówienie online WC-12345",
  "print-config": {},
  "print-email": null,
  "print-type": null,
  "take-away": true
}
```

Use only after legal/fiscal/POS testing.

### 8.11 Cancel order

Action available in docs as `order/cancel` for newer POS versions. Implement only after testing.

### 8.12 Change order status

Docs list status change action as WIP/newer version. Use carefully.

### 8.13 Get list of open orders

Useful for diagnostics or duplicate protection.

### 8.14 Takeaway flags

There are actions for setting/unsetting item(s) as takeaway. Product flags also include takeaway-related flags. For Mammarosa, decide:

- Delivery and pickup online items should probably be `take-away: true`.
- Make sure products are configured to allow takeaway if POS requires it.

### 8.15 Staff notifications / “new order popup”

Docs mention optional POS staff notifications for issued orders. If desired behavior is a clear staff notification, contact Dotypos/integration support and ask them to enable notifications for your API client application.

---

## 9. Recommended WooCommerce → Dotypos architecture

### 9.1 Plugin modules

```txt
DotyposAuthService
DotyposApiClient
DotyposProductSyncService
DotyposOrderMapper
DotyposPosActionService
DotyposWebhookController
DotyposAdminSettings
DotyposLogger
```

### 9.2 Database/meta mapping

WooCommerce product meta:

```txt
_dotypos_product_id
_dotypos_product_external_id
_dotypos_category_id
_dotypos_has_customizations
_dotypos_last_version_date
_dotypos_last_sync_hash
```

WooCommerce order meta:

```txt
_dotypos_external_id = WC-{order_id}
_dotypos_cloud_id
_dotypos_branch_id
_dotypos_pos_action_status
_dotypos_pos_action_code
_dotypos_order_id, if response returns it
_dotypos_last_request_id
_dotypos_last_error
```

Addon mapping table or option:

```txt
woo_addon_key
woo_addon_label
woo_addon_price
dotypos_product_customization_id
dotypos_addon_product_id
dotypos_manual_price_override
```

### 9.3 Product sync flow

```pseudo
refresh access token if needed
for page in products pages:
  GET /products?include=customizations,ingredients&page=N&limit=100
  for product in data:
    if deleted or display false:
      hide product if setting enabled
    else:
      upsert Woo product
      map category
      map price
      map product id
      map customizations
save sync report
```

### 9.4 Order send flow

```pseudo
on WooCommerce order status = processing/on-hold/new depending payment method:
  if already has _dotypos_sent_success: stop
  build external-id = WC-{order_id}
  validate every Woo item has _dotypos_product_id
  map addons to Dotypos customizations
  add delivery fee as POS product or manual-priced product
  build note with customer details
  choose POS action:
    unpaid/pay later -> order/create
    paid online -> maybe order/create OR order/create-issue-pay after testing
  POST pos-actions
  inspect HTTP status and response code
  save logs/meta
  on transient failure, schedule retry with idempotency guard
```

### 9.5 Idempotency / duplicate prevention

Use `external-id = WC-{order_id}` in every POS order action.

Before retrying after uncertain timeout:

1. Search/read open/recent orders if possible by `externalId`.
2. If found, do not create duplicate.
3. If not found and previous error was timeout/429, retry with same external ID.

Keep your own local lock:

```txt
lock key: dotypos_send_order_{order_id}
lock TTL: e.g. 2 minutes
```

### 9.6 Delivery as POS line

Preferred: create POS products:

```txt
DOWÓZ KOŚCIERZYNA
DOWÓZ POZA AGLOMERACJĘ
```

Then send delivery fee as an item:

```json
{
  "id": 999999,
  "qty": 1,
  "manual-price": 14.00,
  "note": "Dostawa poza Kościerzynę, 7 km x 2 zł",
  "take-away": true
}
```

### 9.7 Customer data in note — phase 1

Example order note:

```txt
WWW / WC-12345
Tryb: dostawa
Klient: Jan Kowalski
Tel: 500000000
Adres: Kościerska 1, Kościerzyna
Płatność: przy odbiorze
Uwagi klienta: domofon 12
```

### 9.8 Customer as Dotypos entity — phase 2

Create/update customer only when stable:

```json
{
  "_cloudId": 398610248,
  "firstName": "Jan",
  "lastName": "Kowalski",
  "companyName": "",
  "email": "jan@example.com",
  "phone": "500000000",
  "vatId": "PL1234567890",
  "companyId": "REGON_IF_AVAILABLE",
  "display": true,
  "deleted": false,
  "points": 0,
  "flags": 0,
  "tags": ["WWW"]
}
```

Then pass `customer-id` in POS Action.

---

## 10. Webhooks

Endpoint:

```http
GET    /v2/clouds/{cloudId}/webhooks
POST   /v2/clouds/{cloudId}/webhooks
DELETE /v2/clouds/{cloudId}/webhooks/{webhookId}
```

Webhook fields:

```txt
id
_cloudId
_warehouseId
method          GET or POST
url
payloadEntity   STOCKLOG, POINTSLOG, PRODUCT, ORDERBEAN, RESERVATION, CUSTOMER
payloadVersion  V1
versionDate
```

Use cases:

- Product changes in Dotypos trigger WooCommerce resync.
- Customer/order changes trigger diagnostics.
- Stock changes trigger menu availability updates.

Implementation cautions:

- Validate incoming webhook origin if possible.
- Make handler idempotent.
- Do not do heavy sync directly in webhook request; queue background job.
- Store webhook config locally.

---

## 11. Reports

### 11.1 Base Sales Report

Endpoint:

```http
GET /v2/clouds/{cloudId}/branches/{branchId}/sales-report
```

Query parameters:

```txt
vatPayer boolean
dateFrom ISO datetime with zone offset or Unix ms
dateTo ISO datetime with zone offset or Unix ms
_sellerId number or null
lang lowercase ISO language code
```

Report includes high-level and grouped values:

```txt
moneyTransactionInfo
revenue
vatInfo
paymentTypeInfo
discounts
cashInOutTransactions
categorySales
productSales
tagSales
employeeSales
customerSales
proxySales
takeawaySales
fiscalizationSales
receiptInfo
employeePayments
employeeTips
paymentMethodTips
writeoffs
```

Useful for:

- Sales dashboard.
- Product/category summaries.
- Payment method summaries.
- Tips/writeoffs/cash operations.

Not required for basic online order injection.

---

## 12. Delivery Notes Integrations

Separate integration area for supplier/warehouse delivery notes.

Do not confuse with customer delivery orders.

Use when:

- Supplier uploads electronic delivery note/remittance.
- Warehouse app imports document.
- Stock/prices are updated after confirmation.

For Mammarosa WooCommerce orders: not needed in phase 1.

---

## 13. OMS API

OMS API is local API running on POS itself:

```txt
http://{POS_IP}:5622/oms/api/v1
```

Purpose:

- custom order workflows
- kitchen display systems
- order trackers
- thin clients replacing kitchen printer
- local queue/state-based integrations

Status:

- Development Preview.
- Payloads/endpoints may change.
- Requires Dotypos API registration and requesting OMS credentials from integration@dotypos.com.

For WooCommerce → POS order creation over cloud API, OMS is not the first choice.

---

## 14. Migration / breaking changes

### 14.1 Connector migration

Old connector:

```txt
GET /client/connect with client_secret in URL
```

New connector:

```txt
POST /client/connect/v2 with HMAC-SHA256 signature
```

Never build new code on old GET connector.

### 14.2 API v1 migration themes

Key changes from v1:

- Naming conventions unified.
- Better ETag/atomicity handling.
- Improved filtering/sorting.
- More capable POS Actions.
- More entities available.
- Improved authorization flow.

### 14.3 Breaking changes / validation

Docs mention BC1 validation behavior. Relevant implementation rules:

- Test with current docs and server behavior.
- Include required `flags` fields where docs say needed, e.g. customer creation should include `flags: 0`.
- Do not assume empty result is always 404; newer behavior can return 200 with pagination and empty data.

---

## 15. Implementation examples

### 15.1 PHP: create Connector v2 signature

```php
function dotypos_connector_signature(string $clientSecret, int $timestamp): string {
    return hash_hmac('sha256', (string) $timestamp, $clientSecret);
}
```

### 15.2 PHP: access token request

```php
function dotypos_get_access_token(string $refreshToken, int $cloudId): string {
    $response = wp_remote_post('https://api.dotykacka.cz/v2/signin/token', [
        'headers' => [
            'Authorization' => 'User ' . $refreshToken,
            'Content-Type'  => 'application/json',
            'Accept'        => 'application/json',
        ],
        'body' => wp_json_encode(['_cloudId' => $cloudId]),
        'timeout' => 20,
    ]);

    if (is_wp_error($response)) {
        throw new RuntimeException($response->get_error_message());
    }

    $code = wp_remote_retrieve_response_code($response);
    $body = json_decode(wp_remote_retrieve_body($response), true);

    if ($code < 200 || $code >= 300 || empty($body['accessToken'])) {
        throw new RuntimeException('Dotypos access token error: HTTP ' . $code . ' body=' . wp_json_encode($body));
    }

    return $body['accessToken'];
}
```

### 15.3 PHP: paginated GET helper

```php
function dotypos_get_all_pages(string $url, string $accessToken): array {
    $page = 1;
    $all = [];

    while (true) {
        $pagedUrl = add_query_arg(['page' => $page, 'limit' => 100], $url);
        $res = wp_remote_get($pagedUrl, [
            'headers' => [
                'Authorization' => 'Bearer ' . $accessToken,
                'Accept'        => 'application/json',
            ],
            'timeout' => 30,
        ]);

        if (is_wp_error($res)) {
            throw new RuntimeException($res->get_error_message());
        }

        $code = wp_remote_retrieve_response_code($res);
        if ($code === 404) {
            break;
        }

        $body = json_decode(wp_remote_retrieve_body($res), true);
        if ($code < 200 || $code >= 300 || !is_array($body)) {
            throw new RuntimeException('Dotypos GET error: HTTP ' . $code);
        }

        $data = $body['data'] ?? [];
        $all = array_merge($all, $data);

        if (empty($body['nextPage'])) {
            break;
        }
        $page = (int) $body['nextPage'];
    }

    return $all;
}
```

### 15.4 PHP: send POS Action

```php
function dotypos_send_pos_action(int $cloudId, int $branchId, string $accessToken, array $action): array {
    $url = "https://api.dotykacka.cz/v2/clouds/{$cloudId}/branches/{$branchId}/pos-actions";

    $res = wp_remote_post($url, [
        'headers' => [
            'Authorization' => 'Bearer ' . $accessToken,
            'Content-Type'  => 'application/json',
            'Accept'        => 'application/json',
        ],
        'body' => wp_json_encode($action),
        'timeout' => 30,
    ]);

    if (is_wp_error($res)) {
        throw new RuntimeException($res->get_error_message());
    }

    $http = wp_remote_retrieve_response_code($res);
    $bodyRaw = wp_remote_retrieve_body($res);
    $body = json_decode($bodyRaw, true);

    if ($http === 429) {
        throw new RuntimeException('Dotypos POS Action rate-limited: 429');
    }

    if ($http < 200 || $http >= 300) {
        throw new RuntimeException('Dotypos POS Action HTTP error ' . $http . ': ' . $bodyRaw);
    }

    $posCode = $body['code'] ?? null;
    if ($posCode !== null && (int) $posCode !== 0) {
        throw new RuntimeException('Dotypos POS Action business error code ' . $posCode . ': ' . $bodyRaw);
    }

    return is_array($body) ? $body : ['raw' => $bodyRaw];
}
```

### 15.5 Example WooCommerce order/create payload

```json
{
  "action": "order/create",
  "external-id": "WC-12345",
  "note": "WWW / WC-12345\nTryb: dostawa\nKlient: Jan Kowalski\nTel: 500000000\nAdres: Rynek 1, Kościerzyna\nPłatność: przy odbiorze",
  "items": [
    {
      "id": 10001,
      "qty": 1,
      "note": "Pizza CAPRICCIOSA",
      "customizations": [
        {
          "product-customization-id": 30001,
          "product-id": 20001,
          "qty": 1,
          "manual-price": 4.00
        }
      ],
      "take-away": true
    },
    {
      "id": 99999,
      "qty": 1,
      "manual-price": 5.00,
      "note": "DOWÓZ KOŚCIERZYNA",
      "take-away": true
    }
  ],
  "lock": false
}
```

---

## 16. Claude Code instructions for this project

When editing/creating code:

1. Build for Connector v2 only.
2. Do not expose client secret in public frontend.
3. Keep refresh token secret.
4. Cache access token but refresh defensively.
5. Use ETags for entity updates; do not blindly PATCH/PUT.
6. Implement paging with `limit=100` and robust 404/empty handling.
7. Use `include=customizations,ingredients` when syncing products.
8. For WooCommerce addons, map to POS Action `customizations`, not only notes.
9. Use `external-id = WC-{order_id}` for idempotency.
10. Implement local locks and retry safeguards to avoid duplicate POS orders.
11. Log all Dotypos request/response metadata, redacting tokens.
12. Treat HTTP 200 from POS Actions as transport success only; inspect `code`.
13. Handle 429 from POS Actions by retrying later, not instantly looping.
14. Phase 1 order action should be `order/create` for safety.
15. Only use `order/create-issue-pay` after business/fiscal testing.
16. Delivery should be a POS product line with `manual-price` if variable.
17. Customer can initially be a note; Dotypos customer entity is phase 2.
18. Avoid using Delivery Notes for online customer orders.
19. Keep code tolerant of unknown enum values.
20. Add admin diagnostics: test connection, list branches, sync products, send test order.

---

## 17. Suggested first production checklist

### Credentials/settings

- [ ] Client ID stored
- [ ] Client Secret stored securely
- [ ] Connector v2 callback works
- [ ] Refresh token saved
- [ ] Cloud ID saved
- [ ] Branch ID selected
- [ ] Access token refresh works

### Product sync

- [ ] Fetch branches
- [ ] Fetch categories
- [ ] Fetch products with customizations
- [ ] Map products to WooCommerce
- [ ] Map product customizations/addons
- [ ] Hide deleted/non-displayed products
- [ ] Log sync summary

### POS order sending

- [ ] Create POS test order with simple product
- [ ] Create POS test order with pizza + addon
- [ ] Create POS test order with delivery line
- [ ] Confirm POS/kitchen print behavior
- [ ] Confirm no duplicate on retry
- [ ] Confirm external ID visible/searchable enough
- [ ] Confirm note formatting readable
- [ ] Confirm 429/timeout handling

### Business decisions

- [ ] Unpaid flow: use `order/create`
- [ ] Online paid flow: decide after tests
- [ ] Staff notification: ask Dotypos if needed
- [ ] Customer entity: phase 2
- [ ] Stock integration: phase 3

---

## 18. Official source URLs referenced

```txt
https://docs.api.dotypos.com/
https://docs.api.dotypos.com/getting-started/
https://docs.api.dotypos.com/authorization/
https://docs.api.dotypos.com/delivery-notes-integrations/
https://docs.api.dotypos.com/api-reference/general/data-types/
https://docs.api.dotypos.com/api-reference/general/data-types/validation/
https://docs.api.dotypos.com/api-reference/general/data-types/prices/
https://docs.api.dotypos.com/api-reference/general/schema/
https://docs.api.dotypos.com/api-reference/general/flags/
https://docs.api.dotypos.com/api-reference/general/etags/
https://docs.api.dotypos.com/api-reference/general/etags/etag-examples/
https://docs.api.dotypos.com/api-reference/general/filter/
https://docs.api.dotypos.com/api-reference/general/sort/
https://docs.api.dotypos.com/api-reference/general/paging/
https://docs.api.dotypos.com/api-reference/general/methods/
https://docs.api.dotypos.com/api-reference/general/common-error-responses/
https://docs.api.dotypos.com/api-reference/enums/payment-methods/
https://docs.api.dotypos.com/api-reference/enums/units/
https://docs.api.dotypos.com/api-reference/enums/order-status/
https://docs.api.dotypos.com/entity/branch/
https://docs.api.dotypos.com/entity/category/
https://docs.api.dotypos.com/entity/cloud/
https://docs.api.dotypos.com/entity/customer/
https://docs.api.dotypos.com/entity/order/
https://docs.api.dotypos.com/entity/order-item/
https://docs.api.dotypos.com/entity/product/
https://docs.api.dotypos.com/entity/product-customization/
https://docs.api.dotypos.com/entity/product-ingredient/
https://docs.api.dotypos.com/entity/table/
https://docs.api.dotypos.com/entity/tax-vat-rates/
https://docs.api.dotypos.com/entity/warehouse/
https://docs.api.dotypos.com/pos-actions/pos-actions/
https://docs.api.dotypos.com/oms-api/oms-api/
https://docs.api.dotypos.com/others/reports/base-sales-report/
https://docs.api.dotypos.com/others/webhook/
https://docs.api.dotypos.com/others/breaking-changes/
https://docs.api.dotypos.com/others/third-party-libraries/
https://docs.api.dotypos.com/migrating-from-api-v1/
https://docs.api.dotypos.com/connector-ep-migration/
```

---

## 19. Final decision for Mammarosa integration

Build in this order:

1. Connector v2 auth.
2. Branch selection.
3. Product/category/customization sync.
4. WooCommerce mapping UI for unmapped products/addons.
5. POS Action `order/create` for unpaid orders.
6. Delivery fee as POS product with manual price.
7. Detailed logging/admin diagnostics.
8. Retry/idempotency.
9. Optional webhooks for product sync.
10. Optional customers as Dotypos entities.
11. Optional paid online order flow with `order/create-issue-pay`.
12. Optional stock/reporting.

Most important technical point: **WooCommerce addons must become Dotypos POS Action customizations or separate POS products. If addons stay only in text notes, POS will not treat them as real sale/kitchen/stock lines.**
