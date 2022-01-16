
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try 
      {
          await config.flightSurety.setTestingMode(true);
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
    
    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
    }
    catch(e) {

    }
    let result = await config.flightSuretyData.isRegistered.call(newAirline); 

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");

  });
 
  it(`(First Airline) is account[0] and is registered when contract is deployed`, async function () {
    // Determine if Airline is registered
    let result = await config.flightSuretyData.isRegistered.call(accounts[0]);
    assert.equal(result, true, "First airline was not account[0] that was registed upon contract creation");
  });

  it('only existing airline may register a new airline until there are at least four airlines registered', async () => {
    
    // ARRANGE
    // let newAirline1 = accounts[1];
    
    
    
    // ACT
    try {
        await config.flightSuretyData.fund({from: accounts[0], value: web3.utils.toWei('10', "ether")});
        // await config.flightSuretyApp.registerAirline(config.secondAirline, {from: config.owner});
        // await config.flightSuretyApp.registerAirline(config.thirdAirline, {from: config.owner});

        // await config.flightSuretyData.fund({from: config.firstAirline, value: web3.utils.toWei('10', "ether")});
        // await config.flightSuretyData.fund({from: config.secondAirline, value: web3.utils.toWei('10', "ether")});
        // await config.flightSuretyData.fund({from: config.thirdAirline, value: web3.utils.toWei('10', "ether")});

        // await config.flightSuretyApp.registerAirline(config.fourthAirline, {from: config.firstAirline});
    } catch(e) {
        console.log(e);
    }

    try {
      await config.flightSuretyApp.registerAirline(accounts[1], "newairline2", {from: accounts[0]});    // initial airline (contract owner) is the first registered airline
      // await config.flightSuretyData.registerAirline(accounts[1], "airlineName", true, {from: accounts[0]});
    } catch(e) {
      console.log(e);
    }
    let result = await config.flightSuretyData.isRegistered.call(accounts[1]); 

    // ASSERT
    assert.equal(result, true, "Existing airline should be able to register a new airline until there are at least four airlines registered");
  });
  
});
