
var FlightSuretyApp = artifacts.require("FlightSuretyApp");
var FlightSuretyData = artifacts.require("FlightSuretyData");
var BigNumber = require('bignumber.js');

var Config = async function(accounts) {
    
    // These test addresses are useful when you need to add
    // multiple users in test scripts
    let testAddresses = [
        "0x69e1CB5cFcA8A311586e3406ed0301C06fb839a2",
        "0xF014343BDFFbED8660A9d8721deC985126f189F3",
        "0x0E79EDbD6A727CfeE09A2b1d0A59F7752d5bf7C9",
        "0x9bC1169Ca09555bf2721A5C9eC6D69c8073bfeB4",
        "0xa23eAEf02F9E0338EEcDa8Fdd0A73aDD781b2A86",
        "0x6b85cc8f612d5457d49775439335f83e12b8cfde",
        "0xcbd22ff1ded1423fbc24a7af2148745878800024",
        "0xc257274276a4e539741ca11b590b9447b26a8051",
        "0x2f2899d6d35b1a48a4fbdc93a37a72f264a9fca7",

        "0xacf95bc8d539fcfcfeb3183d736384c2d2deea54",
        "0x0493cfb21710708e389ff2e56a3fc81fd4bd1b39",
        "0x1c559c87aa0bcc8eaf5c03f85c7d25ecbf148d34",
        "0xb31ae38e0bc35c4072aa29d5dacf01f8dfc2a3a6",
        "0xdb45061950caf7d3a7dc1211552ebfb0831e9def",
        "0x7fe0e2b11c980bd93afd198fc91753f367b0aa04",
        "0x7353dd4ee57a5e569259efe97407c173715b550b",
        "0xcdf2249acb7478bee3fa19e3c6423c01fb0c6714",
        "0x2f7be5d2ef836c3448a7e068f24a1acef606016e",
        "0xfe138e4cb34347ee531068d86a9cf4f9becba622",
        "0xfe138e4cb34347ee531068d86a9cf4f9becba644"
    ];


    let owner = accounts[0];
    let firstAirline = accounts[1];
    let secondAirline = accounts[2];
    let thirdAirline = accounts[3];
    let fourthAirline = accounts[4];

    let flightSuretyData = await FlightSuretyData.new();
    let flightSuretyApp = await FlightSuretyApp.new(flightSuretyData.address);

    
    return {
        owner: owner,
        firstAirline: firstAirline,
        secondAirline: secondAirline,
        thirdAirline: thirdAirline,
        fourthAirline: fourthAirline,
        weiMultiple: (new BigNumber(10)).pow(18),
        testAddresses: testAddresses,
        flightSuretyData: flightSuretyData,
        flightSuretyApp: flightSuretyApp
    }
}

module.exports = {
    Config: Config
};