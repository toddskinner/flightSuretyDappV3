
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
    
    // ACT
    try {
        await config.flightSuretyData.fund({from: accounts[0], value: web3.utils.toWei('10', "ether")});
        
        await config.flightSuretyApp.registerAirline(accounts[1], "newairline2", {from: accounts[0]});    // initial airline (contract owner) is the first registered airline
        await config.flightSuretyApp.registerAirline(accounts[2], "newairline3", {from: accounts[0]});

        // await config.flightSuretyData.authorizeCaller(accounts[1], {from: accounts[0]});
        // await config.flightSuretyData.authorizeCaller(accounts[2], {from: accounts[0]});

        await config.flightSuretyData.fund({from: accounts[1], value: web3.utils.toWei('10', "ether")});
        await config.flightSuretyData.fund({from: accounts[2], value: web3.utils.toWei('10', "ether")});

        await config.flightSuretyApp.registerAirline(accounts[3], "newairline4", {from: accounts[1]});
    } catch(e) {
        console.log(e);
    }

    let result = await config.flightSuretyData.isRegistered.call(accounts[3]); 

    // ASSERT
    assert.equal(result, true, "Existing airline should be able to register a new airline until there are at least four airlines registered");
  });
  
  it('fifth airline cannot be registered b/c multi-party consensus of 50% not met', async () => {
    
    // ARRANGE
    await config.flightSuretyData.clearRegisteredAirline(accounts[1]);
    await config.flightSuretyData.clearRegisteredAirline(accounts[2]);
    await config.flightSuretyData.clearRegisteredAirline(accounts[3]);
    
    // ACT
    try {
        // await config.flightSuretyData.fund({from: accounts[0], value: web3.utils.toWei('10', "ether")});
        
        await config.flightSuretyApp.registerAirline(accounts[1], "newairline2", {from: accounts[0]});    // initial airline (contract owner) is the first registered airline
        await config.flightSuretyApp.registerAirline(accounts[2], "newairline3", {from: accounts[0]});
        await config.flightSuretyApp.registerAirline(accounts[3], "newairline4", {from: accounts[0]});

        await config.flightSuretyApp.voteForAirlineRegistration(accounts[4], 1, {from: accounts[0]});

        await config.flightSuretyApp.registerAirline(accounts[4], "newairline5", {from: accounts[0]});
    } catch(e) {
        console.log(e);
    }

    let result = await config.flightSuretyData.isRegistered.call(accounts[4]); 

    // ASSERT
    assert.equal(result, false, "Should not be able to register a fifth airline without multi-party consensus");
  });

  it('can register fifth and subsequent airlines when multi-party consensus of 50% reached prior to the request to register', async () => {
    
    // ARRANGE
    await config.flightSuretyData.clearRegisteredAirline(accounts[1]);
    await config.flightSuretyData.clearRegisteredAirline(accounts[2]);
    await config.flightSuretyData.clearRegisteredAirline(accounts[3]);
    await config.flightSuretyData.clearRegisteredAirline(accounts[4]);

    // ACT
    try {
        // await config.flightSuretyData.fund({from: accounts[0], value: web3.utils.toWei('10', "ether")});
        
        await config.flightSuretyApp.registerAirline(accounts[1], "newairline2", {from: accounts[0]});    // initial airline (contract owner) is the first registered airline
        await config.flightSuretyApp.registerAirline(accounts[2], "newairline3", {from: accounts[0]});
        await config.flightSuretyApp.registerAirline(accounts[3], "newairline4", {from: accounts[0]});

        await config.flightSuretyApp.voteForAirlineRegistration(accounts[4], 1, {from: accounts[0]});
        await config.flightSuretyApp.voteForAirlineRegistration(accounts[4], 2, {from: accounts[0]});

        await config.flightSuretyApp.registerAirline(accounts[4], "newairline5", {from: accounts[0]});
    } catch(e) {
        console.log(e);
    }

    let result = await config.flightSuretyData.isRegistered.call(accounts[4]); 

    // ASSERT
    assert.equal(result, true, "Should be able to register a fifth airline when multi-party consensus is reached prior to the request to register");
  });
  
  it('can register seventh (and subsequent) airlines when multi-party consensus of 50% reached after the request to register', async () => {
    
    // ARRANGE
    await config.flightSuretyData.clearRegisteredAirline(accounts[1]);
    await config.flightSuretyData.clearRegisteredAirline(accounts[2]);
    await config.flightSuretyData.clearRegisteredAirline(accounts[3]);
    await config.flightSuretyData.clearRegisteredAirline(accounts[4]);

    // ACT
    try {
        // await config.flightSuretyData.fund({from: accounts[0], value: web3.utils.toWei('10', "ether")});
        
        await config.flightSuretyApp.registerAirline(accounts[1], "newairline2", {from: accounts[0]});    // initial airline (contract owner) is the first registered airline
        await config.flightSuretyApp.registerAirline(accounts[2], "newairline3", {from: accounts[0]});
        await config.flightSuretyApp.registerAirline(accounts[3], "newairline4", {from: accounts[0]});
        await config.flightSuretyApp.registerAirline(accounts[4], "newairline5", {from: accounts[0]});
        await config.flightSuretyApp.registerAirline(accounts[5], "newairline6", {from: accounts[0]});
        await config.flightSuretyApp.registerAirline(accounts[6], "newairline7", {from: accounts[0]});

        await config.flightSuretyApp.voteForAirlineRegistration(accounts[6], 1, {from: accounts[0]});
        await config.flightSuretyApp.voteForAirlineRegistration(accounts[6], 2, {from: accounts[0]});
        await config.flightSuretyApp.voteForAirlineRegistration(accounts[6], 3, {from: accounts[0]});
        await config.flightSuretyApp.voteForAirlineRegistration(accounts[6], 4, {from: accounts[0]});
    } catch(e) {
        console.log(e);
    }

    let result = await config.flightSuretyData.isRegistered.call(accounts[6]); 

    // ASSERT
    assert.equal(result, true, "Should be able to register a seventh airline when multi-party consensus is reached after the request to register");
  });

  it('airline is registered, but cannot participate in contract since it has not yet submitted funding', async () => {
    
    // ARRANGE
    let flightTimestamp = Math.floor(Date.now() / 1000); 
    // await config.flightSuretyData.clearRegisteredAirline(accounts[1]);
    // await config.flightSuretyData.clearRegisteredAirline(accounts[2]);
    // await config.flightSuretyData.clearRegisteredAirline(accounts[3]);
    // await config.flightSuretyData.clearRegisteredAirline(accounts[4]);
    // await config.flightSuretyData.clearRegisteredAirline(accounts[5]);
    // await config.flightSuretyData.clearRegisteredAirline(accounts[6]);

    // ACT
    try {
        // await config.flightSuretyData.fund({from: accounts[0], value: web3.utils.toWei('10', "ether")});
        // await config.flightSuretyApp.registerAirline(accounts[1], "newairline2", {from: accounts[0]});    // initial airline (contract owner) is the first registered airline
        // await config.flightSuretyApp.registerAirline(accounts[2], "newairline3", {from: accounts[0]});
        // await config.flightSuretyData.fund({from: accounts[2], value: web3.utils.toWei('10', "ether")});

        await config.flightSuretyApp.registerFlight('BX675', flightTimestamp, {from: accounts[6]});    
    } catch(e) {
        console.log(e);
    }

    let result = await config.flightSuretyData.getFlightRegistrationStatus.call(accounts[6], 'BX 675', 1642658304); 

    // ASSERT
    assert.equal(result, false, "Should not be able to register a flight (participate in contract) if not funded");
  });

  it('airline 6 is queued', async () => {
    
    // ARRANGE
  
    // ACT

    let result = await config.flightSuretyData.isQueued.call(accounts[6]); 

    // ASSERT
    assert.equal(result, true, "Account[6] should be queued");
  });

  it('airline 6 is registered', async () => {
    
    // ARRANGE
  
    // ACT

    let result = await config.flightSuretyData.isRegistered.call(accounts[6]); 

    // ASSERT
    assert.equal(result, true, "Account[6] should be registered");
  });

  it('airline 6 is funded', async () => {
    
    // ARRANGE
  
    // ACT
    try {
        await config.flightSuretyData.fund({from: accounts[6], value: web3.utils.toWei('10', "ether")});
    } catch(e) {
        console.log(e);
    }
    let result = await config.flightSuretyData.isFunded.call(accounts[6]); 

    // ASSERT
    assert.equal(result, true, "Account[6] should be funded");
  });

  it('airline is registered and funded so can participate in contract (register flight) since it has submitted funding of 10 ether', async () => {
    
    // ARRANGE
    // account[6] funded in the above
    let flightTimestamp = Math.floor(Date.now() / 1000); 

    try {
        await config.flightSuretyApp.registerFlight('BX675', flightTimestamp, {from: accounts[6]});    
    } catch(e) {
        console.log(e);
    }
    let result = await config.flightSuretyData.getFlightRegistrationStatus.call(accounts[6], 'BX675', flightTimestamp); 

    // ASSERT
    assert.equal(result, true, "Should be able to register a flight (participate in contract) since submitted funding of 10 ether");
  });

});
