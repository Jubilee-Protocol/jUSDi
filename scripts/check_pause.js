const hre = require("hardhat");
async function main() {
    const em = await hre.ethers.getContractAt(
        ["function isPaused() view returns (bool)"],
        "0x2B271251D0215753C3bcF56383Fd6D07765a6d90"
    );
    console.log("Old EM isPaused:", await em.isPaused());

    const newem = await hre.ethers.getContractAt(
        ["function isPaused() view returns (bool)"],
        "0xFdE2746e0d579b693520d5Ab37B87D59CA6DE24c"
    );
    console.log("New EM isPaused:", await newem.isPaused());
}
main();
