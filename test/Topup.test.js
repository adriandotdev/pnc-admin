const MerchantService = require("../services/MerchantService");
const { HttpBadRequest } = require("../utils/HttpError");

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
	Topup: jest
		.fn()
		.mockResolvedValue([[{ STATUS: "SUCCESS", current_balance: 2000 }]]),
	AuditTrail: jest.fn().mockResolvedValue(undefined),
};

describe("Topup Test", () => {
	let merchantService;

	beforeEach(() => {
		merchantService = new MerchantService(mockRepository);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it("should topup successfully", async () => {
		const result = await merchantService.Topup(1, 1000, 1);
		expect(result).toEqual({ status: "SUCCESS", new_balance: 2000 });
		expect(mockRepository.Topup).toHaveBeenCalledWith(1, 1000);
		expect(mockRepository.AuditTrail).toHaveBeenCalledWith({
			admin_id: 1,
			cpo_id: null,
			action: `TOPUP to CPO with id of ${1}`,
			remarks: "success",
		});
	});

	it("should topup successfully", async () => {
		const result = await merchantService.Topup(1, 1000, 1);
		expect(result).toEqual({ status: "SUCCESS", new_balance: 2000 });
		expect(mockRepository.Topup).toHaveBeenCalledWith(1, 1000);
		expect(mockRepository.AuditTrail).toHaveBeenCalledWith({
			admin_id: 1,
			cpo_id: null,
			action: `TOPUP to CPO with id of ${1}`,
			remarks: "success",
		});
	});

	it("should throw bad request - INVALID AMOUNT", async () => {
		try {
			merchantService = new MerchantService(mockRepository);

			await merchantService.Topup(1, -1, 1);
		} catch (err) {
			expect(err).toBeInstanceOf(HttpBadRequest);
			expect(mockRepository.AuditTrail).toHaveBeenCalled();
			expect(mockRepository.AuditTrail).toHaveBeenCalledTimes(1);
			expect(mockRepository.AuditTrail).toHaveBeenCalledWith({
				admin_id: 1,
				cpo_id: null,
				action: `ATTEMPT to TOPUP to CPO with id of ${1}`,
				remarks: "failed",
			});
		}
	});

	it("should throw bad request when status is not SUCCESS", async () => {
		mockRepository.Topup = jest
			.fn()
			.mockResolvedValue([[{ STATUS: "FAILED" }]]);

		merchantService = new MerchantService(mockRepository);

		try {
			await merchantService.Topup(1, 1000, 1);
		} catch (err) {
			expect(err).toBeInstanceOf(HttpBadRequest);
			expect(err.message).toBe("FAILED");
			expect(mockRepository.Topup).toHaveBeenCalledTimes(1);
			expect(mockRepository.AuditTrail).toHaveBeenCalled();
			expect(mockRepository.AuditTrail).toHaveBeenCalledTimes(1);
			expect(mockRepository.AuditTrail).toHaveBeenCalledWith({
				admin_id: 1,
				cpo_id: null,
				action: `ATTEMPT to TOPUP to CPO with id of ${1}`,
				remarks: "failed",
			});
		}
	});
});
