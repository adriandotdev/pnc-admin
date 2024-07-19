const mysql = require("../database/mysql");

module.exports = class EVSERepository {
	CountEVSES() {
		const QUERY = `
			SELECT
				COUNT(*) AS total_evses
			FROM 
				evse 
		`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}
	/**
	 * Retrieves a paginated list of Electric Vehicle Supply Equipment (EVSE) records.
	 *
	 * @function GetEVSES
	 * @param {Object} options - Options object containing limit and offset.
	 * @param {number} options.limit - The maximum number of records to retrieve.
	 * @param {number} options.offset - The number of records to skip before starting to retrieve.
	 * @returns {Promise<Array<Object>>} A promise that resolves to an array of EVSE records.
	 */
	GetEVSES({ limit, offset }) {
		const QUERY = `
            SELECT 
                uid,
                evse_code,
                evse_id,
                model,
                vendor,
                serial_number,
                box_serial_number,
                firmware_version,
                iccid,
                imsi,
				meter_serial_number,
				status,
                cpo_location_id
            FROM evse
			ORDER BY cpo_location_id IS NULL, cpo_location_id ASC
            LIMIT ? OFFSET ?
        `;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [limit, offset], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * Registers a new Electric Vehicle Supply Equipment (EVSE) in the system.
	 *
	 * @function RegisterEVSE
	 * @param {Object} data - The data required to register the EVSE.
	 * @param {string} data.uid - The unique identifier for the EVSE.
	 * @param {string} data.model - The model of the EVSE.
	 * @param {string} data.vendor - The vendor of the EVSE.
	 * @param {string} data.serial_number - The serial number of the EVSE.
	 * @param {string} data.box_serial_number - The box serial number of the EVSE.
	 * @param {string} data.firmware_version - The firmware version of the EVSE.
	 * @param {string} data.iccid - The ICCID of the EVSE.
	 * @param {string} data.imsi - The IMSI of the EVSE.
	 * @param {string} data.meter_type - The meter type of the EVSE.
	 * @param {string} data.meter_serial_number - The meter serial number of the EVSE.
	 * @param {string} [data.location_id] - The location ID where the EVSE is installed (optional).
	 * @returns {Promise<Object>} A promise that resolves to an object containing the result of the registration and the database connection.
	 */
	RegisterEVSE(data) {
		const QUERY = `
           CALL WEB_ADMIN_REGISTER_EVSE(?,?,?,?,?,?,?,?,?,?,?)
        `;

		return new Promise((resolve, reject) => {
			mysql.getConnection((err, connection) => {
				connection.beginTransaction((err) => {
					if (err) {
						reject({ err, connection });
						return;
					}

					connection.query(
						QUERY,
						[
							data.uid,
							data.model,
							data.vendor,
							data.serial_number,
							data.box_serial_number,
							data.firmware_version,
							data.iccid,
							data.imsi,
							data.meter_type,
							data.meter_serial_number,
							data.location_id || null,
						],
						(err, result) => {
							if (err) {
								reject({ err, connection });
							}

							resolve({ result, connection });
						}
					);
				});
			});
		});
	}

	/**
	 * Binds an Electric Vehicle Supply Equipment (EVSE) to a location.
	 *
	 * @function BindEVSE
	 * @param {Object} data - Data required to bind the EVSE.
	 * @param {string} data.location_id - The ID of the location to bind the EVSE to.
	 * @param {string} data.evse_uid - The unique identifier of the EVSE to bind.
	 * @returns {Promise<Object>} A promise that resolves to the result of the bind operation.
	 */
	BindEVSE(data) {
		const QUERY = `CALL WEB_ADMIN_BIND_EVSE(?,?)`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [data.location_id, data.evse_uid], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * Unbinds an Electric Vehicle Supply Equipment (EVSE) from a location.
	 *
	 * @function UnbindEVSE
	 * @param {Object} data - Data required to unbind the EVSE.
	 * @param {string} data.location_id - The ID of the location from which to unbind the EVSE.
	 * @param {string} data.evse_uid - The unique identifier of the EVSE to unbind.
	 * @returns {Promise<Object>} A promise that resolves to the result of the unbind operation.
	 */
	UnbindEVSE(data) {
		const QUERY = `CALL WEB_ADMIN_UNBIND_EVSE(?,?)`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [data.location_id, data.evse_uid], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * Adds payment types to an Electric Vehicle Supply Equipment (EVSE).
	 *
	 * @function AddEVSEPaymentTypes
	 * @param {Array<Array<string>>} paymentTypes - The payment types to add, each represented as an array [evse_uid, payment_type_id].
	 * @param {Object} connection - The database connection object.
	 * @returns {Promise<Object>} A promise that resolves to the result of the database insert operation.
	 */
	AddEVSEPaymentTypes(paymentTypes, connection) {
		const QUERY = `INSERT INTO evse_payment_types (evse_uid, payment_type_id)
		VALUES ?`;

		return new Promise((resolve, reject) => {
			connection.query(QUERY, [paymentTypes], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * Adds capabilities to an Electric Vehicle Supply Equipment (EVSE).
	 *
	 * @function AddEVSECapabilities
	 * @param {Array<Array<string>>} capabilities - The capabilities to add, each represented as an array [capability_id, evse_uid].
	 * @param {Object} connection - The database connection object.
	 * @returns {Promise<Object>} A promise that resolves to the result of the database insert operation.
	 */
	AddEVSECapabilities(capabilities, connection) {
		const QUERY = `INSERT INTO evse_capabilities (capability_id, evse_uid) VALUES ?`;

		return new Promise((resolve, reject) => {
			connection.query(QUERY, [capabilities], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * Retrieves default payment types from the database.
	 *
	 * @function GetDefaultPaymentTypes
	 * @returns {Promise<Object>} A promise that resolves to the result of the database query, containing default payment types.
	 */
	GetDefaultPaymentTypes() {
		const QUERY = `SELECT * FROM payment_types`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * Retrieves default capabilities from the database.
	 *
	 * @function GetDefaultCapabilities
	 * @returns {Promise<Object>} A promise that resolves to the result of the database query, containing default capabilities.
	 */
	GetDefaultCapabilities() {
		const QUERY = `SELECT * FROM capabilities`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	GetDefaultConnectorTypes() {
		const QUERY = `SELECT * FROM connector_types`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, (err, result) => {
				if (err) reject(err);

				resolve(result);
			});
		});
	}

	/**
	 * Searches for Electric Vehicle Supply Equipment (EVSE) by serial number.
	 *
	 * @function SearchEVSEBySerialNumber
	 * @param {string} serialNumber - The serial number to search for.
	 * @param {number} limit - The maximum number of results to return.
	 * @param {number} offset - The number of results to skip before starting to return data.
	 * @returns {Promise<Object>} A promise that resolves to the result of the database query, containing EVSE information matching the serial number search.
	 */
	SearchEVSEBySerialNumber(serialNumber, limit, offset) {
		const QUERY = `
			SELECT 
				uid,
				evse_code,
				evse_id,
				model,
				vendor,
				serial_number,
				box_serial_number,
				firmware_version,
				iccid,
				imsi,
				meter_serial_number,
				status,
				cpo_location_id
			FROM evse
			WHERE LOWER(serial_number) LIKE ?
			LIMIT ${limit} OFFSET ${offset}
		`;

		const PATTERN = `%${serialNumber}%`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [`%${serialNumber}%`], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * Logs an audit trail entry.
	 *
	 * @function AuditTrail
	 * @param {string} admin_id - The ID of the admin performing the action.
	 * @param {string} cpo_id - The ID of the Charging Point Operator (CPO), if applicable.
	 * @param {string} action - The action performed.
	 * @param {string} remarks - Additional remarks about the action.
	 * @returns {Promise<Object>} A promise that resolves to the result of the database insert operation, representing the audit trail entry.
	 */
	AuditTrail({ admin_id, cpo_id, action, remarks }) {
		const QUERY = `
			INSERT INTO 
				admin_audit_trails (admin_id, cpo_id, action, remarks, date_created, date_modified)
			VALUES (
				?,?,?,?,NOW(),NOW()
			)
		`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [admin_id, cpo_id, action, remarks], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}
};
