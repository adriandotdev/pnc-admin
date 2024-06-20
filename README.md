# Admin EVSEs APIs

# URL

`https://services-parkncharge.sysnetph.com/admin_evses`

## APIs

### GET EVSEs - `GET /api/v1/evses?limit=1&offset=0`

**Description**

Get all of the EVSEs (Electric Vehicle Supply Equipment)

**Parameters**

- **limit**
  - Number of objects to retrieved
  - Type: Number
- **offset**
  - Starting object to be retrieved
  - Type: Number

**Sample EVSE object**

```json
{
	"uid": "09149625-e6e4-4655-ad7a-fe8008e051e9",
	"evse_code": "NCR0000000042",
	"evse_id": "PHPNCE0000000042",
	"model": "PowerCharge Max",
	"vendor": "EcoCharge Solutions",
	"serial_number": "EVCHRG123123123",
	"box_serial_number": "BOX123123123",
	"firmware_version": "v2.1.3",
	"iccid": "89014103211118510775",
	"imsi": "310260000000003",
	"cpo_location_id": 55
}
```

---

### REGISTER EVSE - `POST /api/v1/evses`

**Description**

Registers new EVSEs

**Request**

```json
{
	"party_id": "PNC",
	"model": "ChargeMaster Plus",
	"vendor": "VoltCharge Technologies",
	"serial_number": "EVCHRG123456789",
	"box_serial_number": "BOX987654321",
	"firmware_version": "v2.1.0",
	"iccid": "89014103211118510777",
	"imsi": "310260000000005",
	"meter_type": "AC",
	"meter_serial_number": "MTRAC123456789",
	"kwh": 7, // Valid kwhs are 7, 22, 60, and 80
	"connectors": [
		{
			"standard": "TYPE_2",
			"format": "SOCKET",
			"power_type": "AC",
			"max_voltage": 210,
			"max_amperage": 140,
			"max_electric_power": 45,
			"rate_setting": 7
		},
		{
			"standard": "TYPE_2",
			"format": "SOCKET",
			"power_type": "AC",
			"max_voltage": 210,
			"max_amperage": 140,
			"max_electric_power": 45,
			"rate_setting": 7
		}
	],
	"payment_types": [1, 2], // Provide only payment id
	"capabilities": [1, 2, 3], // Provide only capability id
	"location_id": 0
}
```

> NOTE: EVSE must have atleast one (1) connector.

> NOTE: All fields are required.

> NOTE: If you want to bind the EVSE during registration, specify the location_id, and if not make it 0.

**Response**

```json
{
	"status": 200,
	"data": "SUCCESS",
	"message": "Success"
}
```

**Errors**

- **LOCATION_ID_DOES_NOT_EXISTS**

- **Unrpocessable Entity**

---

### BIND / UNBIND evse - `PATCH /api/v1/evses/:action/:location_id/:evse_uid`

**Description**

Bind or Unbind EVSE to location.

**Parameters**

- **action**
  - Valid actions are: bind or unbind
  - Type: String
- **location_id**
  - Location's ID
  - Type: Number
- **evse_uid**
  - EVSE's UID
  - Type: String

**Response**

```json
{
	"status": 200,
	"data": "SUCCESS",
	"message": "Success"
}
```

**Errors**

- **Invalid action. Valid actions are: bind or unbind**

- **LOCATION_ID_DOES_NOT_EXISTS**

- **EVSE_UID_DOES_NOT_EXISTS**

- **EVSE_ALREADY_BINDED**

---

### Default Data - `GET /api/v1/evses/data/defaults`

**Description**

Retrieve list of data for registering EVSE

**Authorization: Basic TOKEN**

**Response**

```json
{
	"status": 200,
	"data": {
		"payment_types": [],
		"capabilities": []
	},
	"message": "Success"
}
```

---

### Search EVSE by Serial Number - `GET /api/v1/evses/search/:serial_number/:limit/:offset`

**Description**

Search EVSE by Serial Number

**Authorization: Bearer TOKEN**

**Parameters**

- **serial_number** - EVSE's serial number
- **limit** - Number of EVSE to return
- **offset** - Starting row to return

**Response**

```json
{
	"status": 200,
	"data": [
		{
			"uid": "0f02b609-0337-434e-8487-25308f13e54b",
			"evse_code": "NCR0000000061",
			"evse_id": "PHPNCE0000000061",
			"model": "ChargeMaster Plus",
			"vendor": "VoltCharge Technologies",
			"serial_number": "EVCHRG123456789",
			"box_serial_number": "BOX987654321",
			"firmware_version": "v2.1.0",
			"iccid": "89014103211118510777",
			"imsi": "310260000000005",
			"cpo_location_id": 1
		},
		{
			"uid": "ffa8ed36-8b86-47ab-9ddd-77cec4988a43",
			"evse_code": "NCR0000000066",
			"evse_id": "PHPNCE0000000066",
			"model": "ChargeMaster Plus",
			"vendor": "VoltCharge Technologies",
			"serial_number": "EVCHRG123456789",
			"box_serial_number": "BOX987654321",
			"firmware_version": "v2.1.0",
			"iccid": "89014103211118510777",
			"imsi": "310260000000005",
			"cpo_location_id": 1
		}
	],
	"message": "Success"
}
```
