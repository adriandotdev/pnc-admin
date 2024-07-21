const EVSEService = require("../services/EVSEService");
const { HttpBadRequest } = require("../utils/HttpError");

jest.mock("mysql2", () => {
	const mConnection = {
		release: jest.fn(),
		commit: jest.fn(),
		rollback: jest.fn(),
		query: jest.fn(),
	};

	const mPool = {
		getConnection: jest.fn((callback) => callback(null, mConnection)),
		on: jest.fn(),
	};
	return {
		createPool: jest.fn(() => mPool),
	};
});

const evseRepository = {
	CountEVSES: jest.fn(),
	GetEVSES: jest.fn(),
};

const connectorRepository = {};

describe("EVSE Service - Unit Tests", () => {
	/**
	 * @type {EVSEService}
	 */
	let service;

	beforeEach(() => {
		service = new EVSEService(evseRepository, connectorRepository);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it("should successfully retrieved list of EVSEs - GetEVSES", async () => {
		evseRepository.CountEVSES.mockResolvedValue([{ total_evses: 1 }]);
		evseRepository.GetEVSES.mockResolvedValue([{ id: 1 }, { id: 2 }]);

		const result = await service.GetEVSES({ limit: 10, offset: 0 });

		expect(result).toEqual({
			evses: [{ id: 1 }, { id: 2 }],
			total_evses_returned: 2,
			total_evses: 1,
			limit: 10,
			offset: 0,
		});
		expect(evseRepository.CountEVSES).toHaveBeenCalledTimes(1);
		expect(evseRepository.GetEVSES).toHaveBeenCalledTimes(1);
	});

	it("should throw BAD REQUEST when limit value is not a number - GetEVSES", async () => {
		try {
			await service.GetEVSES({ limit: "invalid limit value", offset: 0 });
		} catch (err) {
			expect(err).toBeInstanceOf(HttpBadRequest);
			expect(err.message).toBe(
				"Invalid limit. Limit must be on type of number"
			);
			expect(evseRepository.CountEVSES).not.toHaveBeenCalled();
			expect(evseRepository.GetEVSES).not.toHaveBeenCalled();
		}
	});

	it("should throw BAD REQUEST when offset value is not a number - GetEVSES", async () => {
		try {
			await service.GetEVSES({ limit: 10, offset: "invalid offset value" });
		} catch (err) {
			expect(err).toBeInstanceOf(HttpBadRequest);
			expect(err.message).toBe(
				"Invalid offset. Offset must be in type of number"
			);
			expect(evseRepository.CountEVSES).not.toHaveBeenCalled();
			expect(evseRepository.GetEVSES).not.toHaveBeenCalled();
		}
	});
});
