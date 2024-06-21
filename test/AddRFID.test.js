const MerchantService = require("../services/MerchantService");
const {
	HttpBadRequest,
	HttpInternalServerError,
	HttpError,
} = require("../utils/HttpError");
jest.mock("mysql2", () => {
	const mConnection = {
		release: jest.fn(),
	};
	const mPool = {
		getConnection: jest.fn((callback) => callback(null, mConnection)),
		on: jest.fn(),
	};
	return {
		createPool: jest.fn(() => mPool),
	};
});

const mockRepository = {
	AddRFID: jest
		.fn()
		.mockImplementation((cpoOwnerID, rfidCardTag) => [[{ STATUS: "SUCCESS" }]]),
	AuditTrail: jest.fn().mockResolvedValue(undefined),
};

describe("Add RFID Method test", () => {
	let merchantService;

	beforeEach(() => {
		merchantService = new MerchantService(mockRepository);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it("should ADD RFID to CPO", async () => {
		merchantService = new MerchantService(mockRepository);

		const testData = {
			cpo_owner_id: 1,
			rfidCardTag: "12345678",
			admin_id: 1,
		};

		const result = await merchantService.AddRFID(
			testData.cpo_owner_id,
			testData.rfidCardTag,
			testData.admin_id
		);

		expect(result).toBe("SUCCESS");
		expect(mockRepository.AuditTrail).toHaveBeenCalledTimes(1);
		expect(mockRepository.AuditTrail).toHaveBeenCalledWith({
			admin_id: 1,
			cpo_id: null,
			action: `ADD RFID to Charging Point Operator with id of ${testData.cpo_owner_id}`,
			remarks: "success",
		});
	});

	it("should return Bad Request when STATUS is FAILED", async () => {
		mockRepository.AddRFID = jest
			.fn()
			.mockImplementation((cpoOwnerID, rfidCardTag) => [
				[{ STATUS: "FAILED" }],
			]);

		merchantService = new MerchantService(mockRepository);

		const testData = {
			cpo_owner_id: 1,
			rfidCardTag: "12345678",
			admin_id: 1,
		};

		try {
			await merchantService.AddRFID(
				testData.cpo_owner_id,
				testData.rfidCardTag,
				testData.admin_id
			);
		} catch (err) {
			expect(err).toBeInstanceOf(HttpBadRequest);
			expect(mockRepository.AuditTrail).toHaveBeenCalledTimes(1);
			expect(mockRepository.AuditTrail).toHaveBeenCalledWith({
				admin_id: testData.admin_id,
				cpo_id: null,
				action: "ATTEMPT to ADD RFID to Charging Point Operator",
				remarks: "failed",
			});
		}
	});

	it("should return Internal Server Error", async () => {
		mockRepository.AddRFID = jest.fn().mockRejectedValue();

		merchantService = new MerchantService(mockRepository);

		const testData = {
			cpo_owner_id: 1,
			rfidCardTag: "12345678",
			admin_id: 1,
		};

		try {
			await merchantService.AddRFID(
				testData.cpo_owner_id,
				testData.rfidCardTag,
				testData.admin_id
			);
		} catch (err) {
			expect(mockRepository.AuditTrail).toHaveBeenCalledTimes(1);
			expect(mockRepository.AuditTrail).toHaveBeenCalledWith({
				admin_id: testData.admin_id,
				cpo_id: null,
				action: "ATTEMPT to ADD RFID to Charging Point Operator",
				remarks: "failed",
			});
		}
	});
});
