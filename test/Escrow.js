const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n) => {
    return ethers.utils.parseUnits(n.toString(), 'ether')
}

describe('Escrow', () => {
    let buyer, seller, inspector, lender;
    let realEstate;
    let escrow;

    beforeEach(async () => {
        //set up accounts
        [buyer, seller, inspector, lender] = await ethers.getSigners();

        //deploy the real estate contract
        const RealEstate = await ethers.getContractFactory('RealEstate');
        realEstate = await RealEstate.deploy();
        //mint
        let transaction = await realEstate.connect(seller).mint("https://ipfs.io/ipfs/QmQVcpsjrA6cr1iJjZAodYgbnXGo4DFubJiLc2EB/1.json");
        await transaction.wait();
        //deploy the escrow account
        const Escrow = await ethers.getContractFactory('Escrow');
        escrow = await Escrow.deploy(
            realEstate.address,
            seller.address,
            inspector.address,
            lender.address
        );
        //approve property
        transaction = await realEstate.connect(seller).approve(escrow.address, 1)
        await transaction.wait()
        //list property
        transaction = await escrow.connect(seller).list(1, tokens(10), buyer.address, tokens(5))
        await transaction.wait()
    });

    describe('Deployment', () => {
        it('Returns NFT address', async () => {
            const result = await escrow.nftAddress()
            expect(result).to.be.equal(realEstate.address)
        });
        it("Returns seller", async () => {
            const escrowSeller = await escrow.seller()
            expect(escrowSeller).to.be.equal(seller.address)    
        });
        it("Returns inspector", async () => {
            const escrowInspector = await escrow.inspector()
            expect(escrowInspector).to.be.equal(inspector.address)    
        });
        it("Returns lender", async () => {
            const escrowLender = await escrow.lender()
            expect(escrowLender).to.be.equal(lender.address)    
        });
    });

    describe('Listing', () => {
        it('updates it as listed', async () => {
            const listed = await escrow.isListed(1)
            expect(listed).to.be.equal(true)
        });
        it('Updates the ownership', async () => {
            expect(await realEstate.ownerOf(1)).to.be.equal(escrow.address)
        });
        it('Returns purchase price', async () => {
            const purPrice = await escrow.purchasePrice(1)
            expect(purPrice).to.be.equal(tokens(10))
        });
        it('returns buyer', async () => {
            const buyerAdd = await escrow.buyer(1)
            expect(buyerAdd).to.be.equal(buyer.address)
        });
        it('Returns escrow amount', async () => {
            const escrowAmt = await escrow.escrowAmount(1)
            expect(escrowAmt).to.be.equal(tokens(5))
        });
    });

    describe('Deposits', () => {
        it('Updates contract balance', async () => {
            const transaction = await escrow.connect(buyer).depositEarnest(1, { value: tokens(5) })
            await transaction.wait()
            const result = await escrow.getBalance()
            expect(result).to.be.equal(tokens(5))
        });
    });
    describe('INspection', () => {
        it('Updates inspection status', async () => {
            const transaction = await escrow.connect(inspector).updateInsepctionStatus(1, true)
            await transaction.wait()
            const result = await escrow.inspectionPassed(1)
            expect(result).to.be.equal(true)
        })
    })
    describe('approval', () => {
        it('updates approval status', async () => {
            let transaction = await escrow.connect(buyer).approveSale(1)
            await transaction.wait()

            transaction = await escrow.connect(seller).approveSale(1)
            await transaction.wait()

            transaction = await escrow.connect(lender).approveSale(1)
            await transaction.wait()

            expect(await escrow.approval(1, buyer.address)).to.be.equal(true)
            expect(await escrow.approval(1, seller.address)).to.be.equal(true)
            expect(await escrow.approval(1, lender.address)).to.be.equal(true)
        })
    })
    describe('Sale', async () => {
        beforeEach(async () => {
            let transaction = await escrow.connect(buyer).depositEarnest(1, { value: tokens(5) })
            await transaction.wait()

            transaction = await escrow.connect(inspector).updateInsepctionStatus(1, true)
            await transaction.wait()

            transaction = await escrow.connect(buyer).approveSale(1)
            await transaction.wait()

            transaction = await escrow.connect(seller).approveSale(1)
            await transaction.wait

            transaction = await escrow.connect(lender).approveSale(1)
            await transaction.wait
            
            await lender.sendTransaction({ to: escrow.address, value: tokens(5) })

            transaction = await escrow.connect(seller).finalizeSale(1)
            await transaction.wait()
        })
        
        it('Updates ownership', async () => {
            expect(await realEstate.ownerOf(1)).to.be.equal(buyer.address)
        })

        it('Updates balance', async () => {
            expect(await escrow.getBalance()).to.be.equal(0)
        })
    })
});
