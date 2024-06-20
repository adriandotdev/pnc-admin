const mysql = require("../database/mysql");

module.exports = class ConnectorRepository {
	/**
	 * Adds connectors to an Electric Vehicle Supply Equipment (EVSE).
	 *
	 * @function AddConnector
	 * @param {string} uid - The unique identifier of the EVSE.
	 * @param {Array<Object>} data - An array of connector data objects.
	 * @param {string} data[].standard - The standard of the connector.
	 * @param {string} data[].format - The format of the connector.
	 * @param {number} data[].power_type - The power type ID of the connector.
	 * @param {number} data[].max_voltage - The maximum voltage of the connector.
	 * @param {number} data[].max_amperage - The maximum amperage of the connector.
	 * @param {number} data[].max_electric_power - The maximum electric power of the connector.
	 * @param {number} data[].rate_setting - The rate setting of the connector in KW-H.
	 * @param {Object} connection - The database connection object.
	 * @returns {Promise<Object>} A promise that resolves to the result of the database insert operation.
	 */
	AddConnector(uid, data, connection) {
		const QUERY = `
            INSERT INTO evse_connectors (
                evse_uid,
				connector_id,
                standard,
                format,
                power_type_id,
                max_voltage,
                max_amperage,
                max_electric_power,
                connector_type_id,
                rate_setting_id,
                status,
                date_created,
                date_modified
            )
            VALUES ?
        `;

		let values = data.map((connector, index) => [
			uid,
			index + 1,
			connector.standard,
			connector.format,
			connector.power_type,
			connector.max_voltage,
			connector.max_amperage,
			connector.max_electric_power,
			connector.standard,
			connector.rate_setting + " KW-H",
			"AVAILABLE",
			new Date(),
			new Date(),
		]);

		return new Promise((resolve, reject) => {
			connection.query(QUERY, [values], (err, result) => {
				if (err) {
					reject(err);
				} else {
					resolve(result);
				}
			});
		});
	}

	/**
	 * Adds timeslots for connectors of an Electric Vehicle Supply Equipment (EVSE) based on kWh.
	 *
	 * @function AddTimeslots
	 * @param {string} uid - The unique identifier of the EVSE.
	 * @param {number} lastInsertID - The last inserted ID from the `evse_timeslots` table.
	 * @param {number} kwh - The kilowatt-hour setting for the EVSE.
	 * @param {number} connectorsCount - The number of connectors.
	 * @param {Object} connection - The database connection object.
	 * @returns {Promise<Object>} A promise that resolves to the result of the database insert operation.
	 */
	AddTimeslots(uid, lastInsertID, kwh, connectorsCount, connection) {
		/**
		 * Generates a list of timeslots for each connector.
		 *
		 * @function GenerateTimeslots
		 * @param {Object[]} connectorIDs - List of connector IDs.
		 * @param {number} startingID - Starting index from the `evse_timeslots` table.
		 * @param {number} endingID - Ending index from the `evse_timeslots` table.
		 */
		function GenerateTimeslots(connectorIDs, startingID, endingID) {
			for (let connectorID of connectorIDs) {
				for (let j = startingID; j <= endingID; j++) {
					values.push([uid, connectorID, j, "ONLINE"]);
				}
			}
		}

		const QUERY = `
            INSERT INTO 
                evse_timeslots (evse_uid, connector_id, setting_timeslot_id, status)
            VALUES ?
        `;

		let connectorIDs = Array.from(
			{ length: connectorsCount },
			(_, i) => lastInsertID + i
		);
		let values = [];

		switch (kwh) {
			case 7:
				GenerateTimeslots(connectorIDs, 1, 3);
				break;
			case 22:
				GenerateTimeslots(connectorIDs, 4, 11);
				break;
			case 60:
				GenerateTimeslots(connectorIDs, 12, 19);
				break;
			case 80:
				GenerateTimeslots(connectorIDs, 20, 27);
				break;
		}

		return new Promise((resolve, reject) => {
			connection.query(QUERY, [values], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}
};
