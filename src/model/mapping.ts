import { GlobalVars } from '../globals/globals'
import { TYPE, DYMO, HAS_PARAMETER } from '../globals/uris'

/**
 * A mapping from features/controls/parameters to parameters.
 */
export class Mapping {

	private mappingFunction;
	private constraintFunction;
	private parameterName;
	private targetUris;
	private targetFunction;
	private isUnidirectional;

	constructor(mappingFunction, targets, parameterName, isUnidirectional) {
		this.mappingFunction = mappingFunction;
		this.mappingFunction.addObserver(this);
		this.parameterName = parameterName;
		if (targets) {
			if (targets.length) { //it's an array of uris
				this.setTargetUris(targets);
			} else if (targets) { //it's a constraint function
				this.targetFunction = targets;
				this.targetFunction.addObserver(this);
			}
		}
		this.isUnidirectional = isUnidirectional;
		this.updateAll();
	}

	setTargetUris(targetUris) {
		if (this.targetUris) {
			for (var i = 0, ii = this.targetUris.length; i < ii; i++) {
				GlobalVars.DYMO_STORE.removeParameterObserver(this.targetUris[i], this.parameterName, this);
			}
		}
		this.targetUris = targetUris;
		for (var i = 0, ii = this.targetUris.length; i < ii; i++) {
			GlobalVars.DYMO_STORE.addParameterObserver(this.targetUris[i], this.parameterName, this);
		}
	}

	getTargets() {
		if (this.targetUris && this.targetUris.length > 0) {
			return this.targetUris;
		} else if (this.targetFunction) {
			var allDymos = GlobalVars.DYMO_STORE.findAllSubjects(TYPE, DYMO);
			var tgFunc = this.targetFunction;
			return allDymos.filter(d => tgFunc.applyDirect(null, null, d));
		}
	}

	disconnect() {
		if (this.mappingFunction) this.mappingFunction.disconnect();
		if (this.targetFunction) this.targetFunction.disconnect();
		if (this.constraintFunction) this.constraintFunction.disconnect();
		for (var i = 0, ii = this.targetUris.length; i < ii; i++) {
			GlobalVars.DYMO_STORE.removeParameterObserver(this.targetUris[i], this.parameterName, this);
		}
	}

	private updateAll(changedArgIndex?: number, value?: number) {
		var currentTargets = this.getTargets();
		if (currentTargets) {
			for (var i = 0, ii = currentTargets.length; i < ii; i++) {
				this.update(changedArgIndex, value, currentTargets[i]);
			}
		} else {
			//no targets, so global parameter
			this.update(changedArgIndex, value);
		}
	}

	private update(changedArgIndex, value, target?: string) {
		var newValue = this.mappingFunction.applyDirect(changedArgIndex, value, target);
		GlobalVars.DYMO_STORE.setParameter(target, this.parameterName, newValue);
	}

	observedValueChanged(paramUri, paramType, value) {
		if (!this.isUnidirectional && paramType == this.parameterName) {
			var dymoUri = GlobalVars.DYMO_STORE.findSubject(HAS_PARAMETER, paramUri);
			this.mappingFunction.applyInverse(value, dymoUri);
		}
	}

	observedFunctionChanged(func) {
		this.updateAll();
	}

	requestValue(dymoUri) {
		return this.mappingFunction.requestValue(dymoUri);
	}
}
