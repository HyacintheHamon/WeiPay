import React, { Component } from 'react';
import {
	View, Text, StyleSheet, ScrollView, Dimensions, TouchableWithoutFeedback, Keyboard, SafeAreaView, TextInput,
} from 'react-native';
import { FormInput, Card } from 'react-native-elements';
import Toast from 'react-native-simple-toast';
import RF from 'react-native-responsive-fontsize';
import { connect } from 'react-redux';
import BackWithMenuNav from '../../../components/customPageNavs/BackWithMenuNav';
import {
	processContractByAddress, processFunctionCall2,
} from '../../../../scripts/contracts/contractHelper';
import {
	executeNonPayableNoParams,
	executeNonPayableWithParams,
	executePayableNoParams,
	executePayableWithParams,
} from '../../../../scripts/contracts/contractValidation';
import LinearButton from '../../../components/linearGradient/LinearButton';
import getNetworkProvider from '../../../../constants/Providers';
import ContractInputContainer from '../../../components/contracts/ContractInputContainer';
import ContractInputConstant from '../../../components/contracts/ContractInputConstant';

/**
 * Screen is used to display the passphrase (mnemonic) of the wallet
 */
class Contract extends Component {
	constructor(props) {
		super(props);
		this.state = {
			// contractLoaded: false,
			provider: null,
			address: '',
			// wallet: this.props.hotWallet.wallet,
			// contractEvents: null,
			contractFunctions: null,
			contract: null,
			withInputs: null,
			payable: null,
			// functions: [],
			currentInput: {},
		};
	}

	componentDidMount = async () => {
		const provider = await getNetworkProvider(this.props.network);
		this.setState({ provider });
	}

	getContract = async () => {
		// error handling  
		const { success, objects } = await processContractByAddress(this.props.hotWallet.wallet,
			this.state.address, this.state.provider, this.props.network);
		if (success) {
			// unused contract events
			const { contractFunctions, contract, withInputs } = objects;
			console.log("in getContract success", contractFunctions, contract, withInputs);
			this.setState({contractFunctions, contract, withInputs});
			Toast.show('Success', Toast.LONG);
		}
		else {
			// error in getting contract
			Toast.show('Error loading contract', Toast.LONG);
			console.log("in getContract error from contract");
		}
	}

	processFunctionInput = (text, inputName, inputType, funcName) => {
		let c = Object.assign({}, this.state.currentInput);

		console.log("in input c: ", c);

		if (c[funcName] == null) {
			c[funcName] = {};
		}
		if (inputType === "string") {
			c[funcName][inputName] = "'" + text + "'";
		} else {
			c[funcName][inputName] = text;
		}
		this.setState({ currentInput: c });
	}

  /**
   * Need to check if contract method has no parameters, if it has paramaters, if is payable.
   */
	contractFuncCheck = async (functionItem) => {
		console.log("function check functionItem", functionItem);
		const isFunctionPayable = functionItem.payable;
		const hasFunctionParameters = functionItem.fInputs.length > 0;
		// structural finds
		console.log(isFunctionPayable, hasFunctionParameters);
		const allFunctionDetails = this.state.withInputs;
		
		// let functionName;
		// let functionNameForContract;
		let inputs = this.state.currentInput[functionItem.functionSignature];

		console.log(inputs);
		
		// if (hasFunctionParameters) {
		// 	functionName = functionItem.property;
		// 	functionNameForContract = functionItem.property;
		// 	inputs = this.state.currentInput[functionItem.functionSignature];
		// } else {
		// 	functionName = functionItem.split("(")[0];
		// 	functionNameForContract = functionItem;
		// 	inputs = {};
		// }
		if (!isFunctionPayable && !hasFunctionParameters) {
			if (executeNonPayableNoParams(functionItem.property, {})) {
				console.log("executeNonPayable");
				const result = await processFunctionCall2(this.props.hotWallet.wallet, 
										functionItem.property, {}, this.state.contract, this.state.provider);
				
				// better suited
				Toast.show('Success', Toast.LONG);
				// return was causing crashes
				return result;

			}
		} else if (!isFunctionPayable && hasFunctionParameters) {
			if (executeNonPayableWithParams(functionItem.property, inputs, allFunctionDetails, isFunctionPayable)) {
				console.log("executeNonPayablewithparams");
				const result = await processFunctionCall2(this.props.hotWallet.wallet, 
										functionItem.property, inputs, this.state.contract, this.state.provider);
				Toast.show('Success', Toast.LONG);
				return result;
			}
		} else if (isFunctionPayable && !hasFunctionParameters) {
			if (executePayableNoParams(functionItem.property, {}, allFunctionDetails, isFunctionPayable)) {
				console.log("executePayableNoParams");
				const result = await processFunctionCall2(this.props.hotWallet.wallet, 
											functionItem.property, {}, this.state.contract, this.state.provider);
				
				Toast.show('Success', Toast.LONG);
				return result;
			}
		} else if (isFunctionPayable && hasFunctionParameters) {
			if (executePayableWithParams(functionItem.property, inputs, allFunctionDetails, isFunctionPayable)) {
				console.log("executePayableWithParams");
				const result = await processFunctionCall2(this.props.hotWallet.wallet, 
								functionItem.property, inputs, this.state.contract, this.state.provider);
				
				Toast.show('Success', Toast.LONG);
				return result;
			}
		}
	}

	parseFunctions = () => {
		let contractFunctionsFormatted = [];
		const allFunctionsWithInputs = this.state.withInputs;
		for (let i = 0; i < allFunctionsWithInputs.length; i++) {
			// const arrayLength = contractFunctionsFormatted.length;
			const functionSignature = allFunctionsWithInputs[i].signature;
			const property = functionSignature.split('(')[0];
			const fInputs = allFunctionsWithInputs[i].inputs;
			const payable = allFunctionsWithInputs[i].payable;
			contractFunctionsFormatted.push({property, functionSignature, fInputs, payable });
		}
		console.log("parseFn", contractFunctionsFormatted);
		return (
			<View style={styles.contractInputContainer}>
				{
					contractFunctionsFormatted.map((item, i) =>
						<View key={i} style={styles.functionContainer} >
							<Card>
								<View style={styles.functionInputContainer}>
									{/* <Text>Signature: {item.functionSignature} </Text> */}
									<Text>Signature: {item.property} </Text>
								</View>
								{
									item.payable
										?
										<View style={styles.functionInputContainer}>
											<FormInput
												// placeholder={this.state.payable ? this.state.payable.text : "Ether Value (Payable)"}
												placeholder={"Ether Value (Payable)"}
												onChangeText={(text) => this.processFunctionInput(text, 'payable', 'payable', item.functionSignature)}
												inputStyle={styles.functionInputStyle}
												selectionColor={'#12c1a2'}
											/>
										</View>
										: null
								}
								{
									(item.fInputs.length != 0)
										?
										<View style={styles.topInputContainer}>
											<ContractInputContainer
												signature={item.functionSignature}
												inputs={item.fInputs}
												item={item}
												processInput={this.processFunctionInput}
												contractExecution={this.contractFuncCheck}
											/>
										</View>
										:
										<View style={styles.topInputContainer}>
											<ContractInputConstant
												contractExecution={this.contractFuncCheck}
												item={item}
											/>
										</View>
								}
							</Card>
						</View>)
				}
			</View>
		);
	}

  /**
   * Returns a component that allows the user to view the passphrase
   */
	render() {
		console.log("rerender*********");
		return (
			<SafeAreaView style={styles.safeAreaView}>
				<TouchableWithoutFeedback onPress={Keyboard.dismiss}>
					<View style={styles.mainContainer}>
						<View style={styles.navContainer}>
							<BackWithMenuNav
								showMenu={false}
								showBack={true}
								navigation={this.props.navigation}
							/>
						</View>
						{
							this.state.contractFunctions === null
								?
								<View style={styles.topFormInput}>
									<Text style={styles.textHeader}>Contract Interaction</Text>
									<Text style={styles.textDescription}>Load contract address</Text>
									<View style={styles.addressField}>
										<FormInput
											placeholder={'Contract Address'}
											onChangeText={(add) => { return this.setState({ address: add }); }}
											inputStyle={styles.inputContactName}
											placeholderTextColor={'#b3b3b3'}
											value={this.state.address}
										/>
									</View>
								</View>
								:
								<View style={styles.scrollViewContainer} >
									<ScrollView style={styles.scrollView}>
										{this.parseFunctions()}
									</ScrollView>
								</View>
						}

						<View style={styles.btnContainer}>
							{
								this.state.contractFunctions === null
									?
									<LinearButton
										buttonText='Load Contract'
										onClickFunction={() => this.getContract(this)}
										customStyles={styles.loadButton}
									/>
									: <LinearButton
										buttonText='Reset Contract'
										onClickFunction={() => this.getContract(this)}
										customStyles={styles.loadButton}
									/>
							}
						</View>
					</View>
				</TouchableWithoutFeedback>
			</SafeAreaView>
		);
	}
}

/**
 * Styles used in the BackupPhrase screen
 */
const styles = StyleSheet.create({
	safeAreaView: {
		flex: 1,
		backgroundColor: '#f4f7f9',
	},
	mainContainer: {
		flex: 1,
		backgroundColor: '#f4f7f9',
		justifyContent: 'center',
		width: '100%',
	},
	navContainer: {
		flex: 0.75,
	},
	topFormInput: {
		flex: 5,
		paddingLeft: '5%',
		paddingRight: '5%',
		paddingTop: '5%',
	},
	textHeader: {
		fontFamily: 'Cairo-Light',
		fontSize: RF(4),
		letterSpacing: 0.8,
		paddingLeft: '9%',
		color: '#1a1f3e',
		paddingTop: '2.5%',
		marginBottom: '5%',
	},
	textDescription: {
		fontFamily: 'Cairo-Light',
		fontSize: RF(3),
		letterSpacing: 0.8,
		paddingLeft: '9%',
		color: '#1a1f3e',
	},
	addressField: {
		marginLeft: '5%',
		marginTop: '5%',
		width: '90%',
	},
	inputContactName: {
		fontSize: RF(2.5),
		flexWrap: 'wrap',
		color: '#12c1a2',
		letterSpacing: 0.4,
		fontFamily: 'WorkSans-Light',
		borderBottomWidth: 0.0001,
	},
	scrollViewContainer: {
		flex: 5,
		paddingBottom: '2.5%',
		paddingTop: '2.5%',
	},
	scrollView: {
		height: '100%',
	},
	contractInputContainer: {
		flex: 1,
		alignSelf: 'center',
		alignItems: 'center',
		justifyContent: 'center',
		width: '90%',
	},
	functionContainer: {
		flex: 1,
		alignSelf: 'center',
		alignItems: 'stretch',
		justifyContent: 'space-around',
	},
	functionInputContainer: {
		marginBottom: '5%',
	},
	functionInputStyle: {
		width: '80%',
		fontSize: RF(2.4),
		flexWrap: 'wrap',
		color: '#12c1a2',
		letterSpacing: 0.4,
		fontFamily: 'WorkSans-Regular',
		borderBottomWidth: 0.0001,
	},
	topInputContainer: {
		flex: 1,
	},
	btnFunctionInput: {
		height: Dimensions.get('window').height * 0.05,
		width: Dimensions.get('window').width * 0.82,
	},
	loadButton: {
		width: '82%',
		height: Dimensions.get('window').height * 0.082,
	},
	btnContainer: {
		width: '100%',
		flex: 0.9,
		marginTop: '2.5%',
	},
	button: {
		width: '82%',
		height: Dimensions.get('window').height * 0.082,
	},
});

const mapStateToProps = ({ HotWallet, Wallet }) => {
	const { hotWallet } = HotWallet;
	const { network } = Wallet;
	return { hotWallet, network };
};

export default connect(mapStateToProps, null)(Contract);
