import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';



export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
        this.flighttimestamp1 = new Date('2022-1-05 08:30:00');
        this.flighttimestamp2 = new Date('2022-1-06 09:30:00');
        this.flighttimestamp3 = new Date('2022-1-07 10:30:00');
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {
           
            this.owner = accts[0];

            let counter = 1;
            
            while(this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            callback();
        });
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    fetchFlightStatus(flight, callback) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        } 
        if(flight == "BA234"){
            payload.flightNumber = "BA234";
            payload.departureTime = Math.floor(this.flighttimestamp1.getTime() / 1000);
        } else if(flight == "BA475"){
            payload.flightNumber = "BA475";
            payload.departureTime = Math.floor(this.flighttimestamp2.getTime() / 1000);
        } else if(flight == "BA9876"){
            payload.flightNumber = "BA9876";
            payload.departureTime = Math.floor(this.flighttimestamp3.getTime() / 1000);
        }
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner}, (error, result) => {
                console.log('result: ' + result.toString());
                callback(error, payload);
            });
    }

    registerInitialFlights(callback) {
        let self = this;
        
        let payload = {
            flight1: 'BA234',
            flight2: 'BA475',
            flight3: 'BA9876',
            timestamp1: Math.floor(this.flighttimestamp1.getTime() / 1000),
            timestamp2: Math.floor(this.flighttimestamp2.getTime() / 1000),
            timestamp3: Math.floor(this.flighttimestamp3.getTime() / 1000)
        }

        self.flightSuretyApp.methods
            .fundAirlineAndRegisterInitialFlights(payload.flight1, payload.timestamp1, payload.flight2, payload.timestamp2, payload.flight3, payload.timestamp3)
            .send({from: this.owner, value: this.web3.utils.toWei('10', "ether")}, (error, result) => {
                callback(error, payload);
            });
    }

    async buy(flightNumber, callback) {
        let self = this;
        
        let payload = {
            airline: '0x', 
            flightNumber: 'BA000', 
            departureTime: Math.floor(Date.now() / 1000), 
            insuranceAmount: this.web3.utils.toWei('1', "ether")    // web3.utils.toWei('1', "ether")
        }
        
        if(flightNumber == "BA234"){
            payload.airline = this.owner;
            payload.flightNumber = "BA234";
            payload.departureTime = Math.floor(this.flighttimestamp1.getTime() / 1000);
        } else if(flightNumber == "BA475"){
            payload.airline = this.owner;
            payload.flightNumber = "BA475";
            payload.departureTime = Math.floor(this.flighttimestamp2.getTime() / 1000);
        } else if(flightNumber == "BA9876"){
            payload.airline = this.owner;
            payload.flightNumber = "BA9876";
            payload.departureTime = Math.floor(this.flighttimestamp3.getTime() / 1000);
        }

        self.flightSuretyApp.methods
        .buy(payload.airline, payload.flightNumber, payload.departureTime, payload.insuranceAmount)
        .send({from: this.owner}, (error, result) => {
            console.log('result: ' + result.toString());
            callback(error, payload);
        });
    }

    async withdrawPayouts(callback) {
        let self = this;
        let payload = {}
        console.log("withdraw clicked");
        self.flightSuretyApp.methods
        .withdrawPayouts().send({from: self.owner}, (error, result) => {
            console.log('result: ' + result.toString());
            callback(error, payload);
        });
    }
}