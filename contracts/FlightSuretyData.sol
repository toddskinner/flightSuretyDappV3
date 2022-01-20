pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    uint256 private contractFunds = 0; 
    uint256 private creditedPayoutFunds = 0; 
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
    bytes32[] private contractsArray;

    mapping(address => uint256) private authorizedContracts;

    // Flight status codes
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    struct Airline {
        address airlineAddress;
        string airlineName;
        bool isQueued;
        bool isRegistered;
        bool isFunded;
        uint256 fundingAmount;
        uint256 numVotes;
        mapping(address => bool) voters;
    }
    mapping(address => Airline) private airlines;

    uint256 public numRegisteredAirlines;
    
    struct Flight {
        string flightNumber;
        bool isRegistered;
        uint8 statusCode;
        uint256 timeStamp;   // departure time  
        address airline;
        bytes32[] writtenInsuranceContracts;
        uint256 numInsuranceContracts;
        uint256 potentialLiability;
    }
    mapping(bytes32 => Flight) private flights;

    struct InsuranceContract {
        address airlineAddress;
        string flightNumber;
        uint256 timeStamp;   // departure time  
        uint256 insuranceAmount;
        address passengerAddress;
        bool paidOut;
        uint256 payoutAmount;
        bool isActive;
    }
    mapping (bytes32 => InsuranceContract) private insuranceContracts;

    struct Passenger {
        address passengerAddress;
        uint256 creditAmount;
        bool exists;
    }
    mapping(address => Passenger) private passengers;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
                                (
                                ) 
                                public 
    {
        contractOwner = msg.sender;
        authorizedContracts[msg.sender] = 1;

        airlines[msg.sender].airlineAddress = msg.sender;
        airlines[msg.sender].airlineName = "Initial Air";    
        airlines[msg.sender].isQueued = true;
        airlines[msg.sender].isRegistered = true;
        airlines[msg.sender].isFunded = false;
        airlines[msg.sender].fundingAmount = 0;
        airlines[msg.sender].numVotes = 0;

        numRegisteredAirlines = 1;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /**
    * @dev Modifier that requires the function caller to be authorized. Use on any function that is expected to have an outside caller. 
    */
    modifier isCallerAuthorized()
    {
        require(authorizedContracts[msg.sender] == 1, "Caller is not authorized");
        _;
    }

    

    // modifier requireFlightIsNotRegistered(bytes32 flightKey)
    // {
    //     require(flights[flightKey].isRegistered == false, "Flight is already registered");
    //     _;
    // }

    modifier requirePositiveValue()
    {
        require(msg.value >= 0, "Msg value not greater than 0");
        _;
    }

    modifier requireSufficientFunds(address airline, string flight, uint256 timestamp)
    {
        require((contractFunds - (flights[getFlightKey(airline, flight, timestamp)].potentialLiability) >= 0), "Not enough funds to cover payout");
        _;
    }

    // modifier requireIsQueued()
    // {
    //     require(airlines[msg.sender].isQueued == true, "Airline is not already queued");
    //     _;
    // }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        return operational;
    }

    function isRegistered(address airlineAddress) 
                            public 
                            view 
                            returns(bool) 
    {
        return airlines[airlineAddress].isRegistered;
    }

    function isQueued(address airlineAddress) 
                            public 
                            view 
                            returns(bool) 
    {
        return airlines[airlineAddress].isQueued;
    }

    function isFunded(address airlineAddress) 
                            public 
                            view 
                            returns(bool) 
    {
        return airlines[airlineAddress].isFunded;
    }

    function isAlreadyQueued(address airlineAddress) 
                            public 
                            view 
                            returns(bool) 
    {
        return airlines[airlineAddress].isQueued;
    }

    function getRegisteredAirlineCount() 
                            public 
                            view 
                            returns(uint256) 
    {
        return numRegisteredAirlines;
    }

    function getNumAirlineVotes(address airlineAddress) 
                            public 
                            view 
                            returns (uint256) {
        return (airlines[airlineAddress].numVotes);
    }

    function getVotingStatus(address airlineAddress, address msgSender) 
                            public 
                            view 
                            returns (bool) {
        if(!airlines[airlineAddress].voters[msgSender]){
            return false;
        } else {
            return true;
        }
    }

    function getFlightRegistrationStatus(address airline, string memory flight, uint256 timestamp) 
                            public 
                            view 
                            returns(bool) {
        // bytes32 flightKey = getFlightKey(airline, flight, timestamp);

        return (flights[getFlightKey(airline, flight, timestamp)].isRegistered);
    }

    function getInsurancePurchaseStatus(bytes32 insuranceContractKey) 
                            public 
                            view 
                            returns(bool) 
    {
        return insuranceContracts[insuranceContractKey].isActive;
    }

    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus
                            (
                                bool mode
                            ) 
                            external
                            requireContractOwner 
    {
        operational = mode;
    }

    function authorizeCaller(address dataContract) external requireContractOwner {
        authorizedContracts[dataContract] = 1;
    }

    function deauthorizeCaller(address dataContract) external requireContractOwner {
        delete authorizedContracts[dataContract];
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    // function registerAirline
    //                         (   
    //                             address airlineAddress,
    //                             string airlineName,
    //                             bool isRegisteredBool
    //                         )
    //                         external
    // {

    //     // require(!airlines[airlineAddress].isRegistered, "Airline is already registered.");
        
    //     airlines[airlineAddress] = Airline({
    //                                             airlineAddress: airlineAddress,
    //                                             airlineName: airlineName, 
    //                                             isQueued: true,
    //                                             isRegistered: true,
    //                                             isFunded: false,
    //                                             fundingAmount: 0,
    //                                             numVotes: 1
    //                                     });
        
    //     if(isRegisteredBool){
    //         numRegisteredAirlines++;
    //     }
    // }


    function registerAirline
                            (   
                                address airlineAddress,
                                string airlineName,
                                bool isRegisteredBool
                            )
                            external
                            requireIsOperational
                            // isCallerAuthorized
    {

        require(!airlines[airlineAddress].isRegistered, "Airline is already registered.");
        
        airlines[airlineAddress] = Airline({
                                                airlineAddress: airlineAddress,
                                                airlineName: airlineName, 
                                                isQueued: true,
                                                isRegistered: isRegisteredBool,
                                                isFunded: false,
                                                fundingAmount: 0,
                                                numVotes: 1
                                        });
        
        if(isRegisteredBool){
            numRegisteredAirlines++;
        }
    }


    /**
    * @dev Register a future flight for insuring.
    *
    */  
    function registerFlight
                                (
                                    address airlineAddress,
                                    string flightNum,
                                    uint256 departureTime,
                                    bytes32 flightKey
                                )
                                requireIsOperational
                                external
    {

        require(flights[flightKey].isRegistered == false, "Flight is already registered");
        
        // flights[getFlightKey(airlineAddress, flightNum, departureTime)] = Flight({
        //                                         flightNumber: flightNum,
        //                                         isRegistered: true, 
        //                                         statusCode: STATUS_CODE_UNKNOWN,
        //                                         timeStamp: departureTime,
        //                                         writtenInsuranceContracts: contractsArray,
        //                                         numInsuranceContracts: 0,
        //                                         airline: airlineAddress,
        //                                         potentialLiability: 0
        //                                 });

        flights[flightKey].flightNumber = flightNum;
        flights[flightKey].isRegistered = true;
        flights[flightKey].statusCode = STATUS_CODE_UNKNOWN;
        flights[flightKey].timeStamp = departureTime;
        flights[flightKey].numInsuranceContracts = 0;
        flights[flightKey].airline = airlineAddress;
        flights[flightKey].potentialLiability = 0;
    }

   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy
                            (      
                                address airline,
                                string flightNumber,
                                uint256 timeStamp,    // departure time
                                address passenger, 
                                uint256 insuranceAmount,
                                uint256 payout
                            )
                            external
                            payable
    {
        bytes32 insuranceContractKey = getInsuranceContractKey(airline, flightNumber, timeStamp, passenger);    // msg.sender is passenger
        bytes32 flightKey = getFlightKey(airline, flightNumber, timeStamp);

        
        insuranceContracts[insuranceContractKey] = InsuranceContract ({
                                                airlineAddress: airline,
                                                flightNumber: flightNumber, 
                                                timeStamp: timeStamp,
                                                insuranceAmount: insuranceAmount,
                                                passengerAddress: passenger,       // msg.sender
                                                paidOut: false,
                                                payoutAmount: payout,
                                                isActive: true
                                        });

        uint256 updatedNumContracts = flights[flightKey].numInsuranceContracts + 1;
        flights[flightKey].writtenInsuranceContracts[updatedNumContracts] = insuranceContractKey;
        flights[flightKey].numInsuranceContracts = updatedNumContracts;

        uint256 currentLiability = flights[flightKey].potentialLiability;
        flights[flightKey].potentialLiability = currentLiability + payout;

        contractFunds = contractFunds + msg.value;
        contractOwner.transfer(msg.value);
    }

 
    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                                (
                                    address airline,
                                    string flight,
                                    uint256 timestamp    // departure time
                                )
                                external
                                requireSufficientFunds(airline, flight, timestamp)
    {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);

        for (uint256 i = 0; i < flights[flightKey].writtenInsuranceContracts.length; i++) {
            bytes32 insuranceContractKey = flights[flightKey].writtenInsuranceContracts[i];

            address _passengerAddress = insuranceContracts[insuranceContractKey].passengerAddress;
            uint256 _payoutAmount = insuranceContracts[insuranceContractKey].payoutAmount;

            insuranceContracts[insuranceContractKey].paidOut = true;

            if(passengers[_passengerAddress].exists){

                uint256 updatedCreditAmount = passengers[_passengerAddress].creditAmount + _payoutAmount;
                passengers[_passengerAddress].creditAmount = updatedCreditAmount;
            
            } else {

                passengers[_passengerAddress] = Passenger({
                                                passengerAddress: _passengerAddress,
                                                creditAmount: _payoutAmount, 
                                                exists: true
                                        });

            } 

            contractFunds = contractFunds - _payoutAmount;
        }
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
                            (
                                address passengerAddress
                            )
                            external
                            payable
                            requireIsOperational
    {
        uint256 payment = passengers[passengerAddress].creditAmount;
        
        require(payment <= contractFunds,"Not enough funds to pay out");

        passengerAddress.transfer(payment);
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund
                            (  
                            )
                            public
                            payable
                            requireIsOperational
                            // isCallerAuthorized
                            requirePositiveValue
                            // requireIsQueued
                            returns(bool)
    {   
        uint256 currentFunds = airlines[msg.sender].fundingAmount;
        uint256 newFundingAmount = currentFunds.add(msg.value);
        airlines[msg.sender].fundingAmount = newFundingAmount;

        if(newFundingAmount >= 10 ether){
            airlines[msg.sender].isFunded = true;
            return true;
        } else {
            return false;
        }
        contractFunds = contractFunds + msg.value;
        contractOwner.transfer(msg.value);
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    function getFlightKeyForTesting
                        (
                            address airline,
                            string flight,
                            uint256 timestamp
                        )
                        pure
                        external
                        returns(bytes32) 
    {
        return getFlightKey(airline, flight, timestamp);
    }

    function processFlightStatus
                                (
                                    address airline, 
                                    string flightNumber,
                                    uint256 timestamp,       // departure time
                                    uint8 updatedStatusCode
                                )
                                requireIsOperational
                                external
    {
        flights[getFlightKey(airline, flightNumber, timestamp)].statusCode = updatedStatusCode;
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() 
                            external 
                            payable

    {
        fund();
    }

    /**
    * @dev check if airline is registered
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function checkAirlineRegistered(address checkAirline) external view requireIsOperational  returns(bool) {
        return airlines[checkAirline].isRegistered;
    }

    function registerQueuedAirline(address airlineAddress) 
                            external
                            requireIsOperational
                            returns(bool)
    {
        airlines[airlineAddress].isRegistered = true;
        numRegisteredAirlines++;
        return true;
    }

    function voteForAirlineRegistration(address airlineAddress, uint256 updatedNumVotes) 
                            external
                            requireIsOperational
    {
        airlines[airlineAddress].voters[msg.sender] = true;
        airlines[airlineAddress].numVotes = updatedNumVotes;
    }

    function getInsuranceContractKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp,
                            address passenger
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp, passenger));
    }

    function clearRegisteredAirline
                        (     
                            address airline                     
                        )
                        external
    {
        airlines[airline] = Airline({
                                                airlineAddress: 0,
                                                airlineName: '', 
                                                isQueued: false,
                                                isRegistered: false,
                                                isFunded: false,
                                                fundingAmount: 0,
                                                numVotes: 0
                                        });

        if(numRegisteredAirlines != 1){
            numRegisteredAirlines == 1;
        }
    } 
}

