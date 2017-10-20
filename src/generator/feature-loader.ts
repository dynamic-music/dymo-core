import { Parser, Store, Util } from 'n3';
import { N3Store } from '../io/easystore';
import * as uris from '../globals/uris';
import { Fetcher, FetchFetcher } from '../util/fetcher';

export interface Feature {
	name: string,
	data: DataPoint[]
};

export interface DataPoint {
	time: Value<number>,
	label?: Value<string>
}

export interface Segment extends DataPoint {
	duration?: Value<number>
}

export interface Signal extends DataPoint {
	value: number[]
}

export interface Value<T> {
	value: T
}

export class FeatureLoader {

	private eventOntology = "http://purl.org/NET/c4dm/event.owl#";
	private timelineOntology = "http://purl.org/NET/c4dm/timeline.owl#";
	private featureOntology = "http://purl.org/ontology/af/";
	private vampOntology = "http://purl.org/ontology/vamp/";
	private dublincoreOntology = "http://purl.org/dc/elements/1.1/";

	constructor(private fetcher: Fetcher = new FetchFetcher()) {}


	loadFeature(uriOrJson, labelCondition): Promise<Feature> {
		if (uriOrJson.constructor == Object) {
			//it's a json!
			return Promise.resolve(this.loadFeatureFromJson(uriOrJson, labelCondition));
		} else {
			//just a uri..
			var fileExtension = uriOrJson.split('.');
			fileExtension = fileExtension[fileExtension.length-1];
			return this.fetcher.fetchText(uriOrJson)
				.then(text => {
					if (fileExtension == 'n3') {
						//this.loadFeatureFromRdf(uriOrJson, labelCondition);
					} else if (fileExtension == 'json') {
						return this.loadFeatureFromJson(JSON.parse(text), labelCondition);
					}
				})
		}
	}



	//////////// RDF //////////////

	private loadFeatureFromRdf(rdf, labelCondition): Promise<Feature> {
		return this.parseN3(rdf).then(store => {
				let results = this.loadSegmentationFeatureFromRdf(store);
				if (results.data.length > 0) {
					results.data.sort((a,b) => a.time.value - b.time.value);
					if (labelCondition) {
						results.data = results.data.filter(x => x.label.value == labelCondition);
					}
				} else {
					results = this.loadSignalFeatureFromRdf(store);
				}
				return results;
			});
	}

	private parseN3(data): Promise<N3Store> {
		var store = Store(null, null);
		return new Promise((resolve, reject) =>
			Parser(null).parse(data, (error, triple, prefixes) => {
				if (triple) {
					store.addTriple(triple);
				} else {
					resolve(store);
				}
			})
		);
	}

	private loadSegmentationFeatureFromRdf(store): Feature {
		//for now looks at anything containing event times
		var times = [];
		var events = store.find(null, this.eventOntology+'time', null);
		for (var i = 0, l = events.length; i < l; i++) {
			var time = this.findObjectInStore(store, events[i].object, this.timelineOntology+'at');
			if (!time) {
				time = this.findObjectInStore(store, events[i].object, this.timelineOntology+'beginsAt');
			}
			var duration = this.findObjectInStore(store, events[i].object, this.timelineOntology+'duration');
			var timeObject = {
				time: this.parseXsdNumber(time),
				label: this.parseXsdString(this.findObjectInStore(store, events[i].subject, uris.RDFS_URI+'label'))
			};
			if (duration) {
				timeObject["duration"] = this.parseXsdNumber(duration);
			}
			times.push(timeObject);
		}
		return {
			name: this.parseXsdString(this.findObjectInStore(store, null, this.dublincoreOntology+'title')),
			data: times
		}
	}

	private loadSignalFeatureFromRdf(store): Feature {
		var name = this.parseXsdString(this.findObjectInStore(store, null, this.dublincoreOntology+'title'));
		var signal = this.parseXsdString(this.findObjectInStore(store, null, this.featureOntology+'value'));
		signal = signal.split(" ").map(v => parseFloat(v));
		var dimensions = this.parseXsdString(this.findObjectInStore(store, null, this.featureOntology+'dimensions'));
		dimensions = dimensions.split(' ').map(d => Number.parseInt(d, 10));
		var transform = this.findObjectInStore(store, null, this.vampOntology+'computed_by');
		var stepSize = this.parseXsdNumber(this.findObjectInStore(store, transform, this.vampOntology+'step_size'));
		var sampleRate = this.parseXsdNumber(this.findObjectInStore(store, transform, this.vampOntology+'sample_rate'));

		var values = [];
		var i = 0;
		while (i < signal.length) {
			var currentValue = [];
			for (var j = 0; j < dimensions[0]; j++) {
				currentValue[j] = signal[i+j];
			}
			//insert time/value pairs
			values.push({
				time: {value: i*stepSize/sampleRate},
				value: currentValue
			});
			i += dimensions[0];
		}
		return {
			name:name,
			data:values
		};
	}

	private findObjectInStore(store, subject, predicate) {
		var result = store.find(subject, predicate, null);
		if (result.length > 0) {
			return result[0].object;
		}
	}

	private parseXsdString(string) {
		if (string) {
			return Util.getLiteralValue(string);
		}
	}

	private parseXsdNumber(string) {
		var value = Util.getLiteralValue(string);
		if (value.charAt(0) == 'P') {
			//xsd duration!
			value = value.substring(2, value.length-1);
		}
		return Number(value);
	}



	//////////// JSON //////////////

	private loadFeatureFromJson(json, labelCondition): Feature {
		if (Object.keys(json)[0] == "file_metadata") {
			return this.loadFeatureFromJams(json, labelCondition);
		} else {
			return this.loadFeatureFromJsonLd(json, labelCondition);
		}
	}

	private loadFeatureFromJams(json: {}, labelCondition: string): Feature {
		var results = json[Object.keys(json)[1]][0];
		var outputId = results["annotation_metadata"]["annotator"]["output_id"];
		var data = results.data;
		if (outputId == "beats" || outputId == "onsets" || outputId == "segmentation") {
			if (labelCondition && data[0].label) {
				data = data.filter(x => x.label.value === labelCondition);
			}
		}
		return {
			name: outputId,
			data: data
		}
	}

	private loadFeatureFromJsonLd(json, labelCondition): Feature {
		var type = json["@type"];
		let values;
		if (type == "afv:BarandBeatTracker" || type == "afv:Onsets") {
			let values = json["afo:values"];
			if (labelCondition && values[0]["afo:value"]) {
				values = values.filter(x => x["afo:value"] == labelCondition);
			}
			values = this.convertJsonLdLabelEventsToJson(values);
		} else {
			values = this.convertJsonLdValueEventsToJson(json["afo:values"]);
		}
		return {
			name: type,
			data: values
		}
	}

	private convertJsonLdLabelEventsToJson(events) {
		var times = [];
		for (var i = 0; i < events.length; i++) {
			//insert value/label pairs
			times.push({
				time: {value: events[i]["tl:at"]},
				label: {value: events[i]["afo:value"]}
			});
		}
		return times;
	}

	private convertJsonLdValueEventsToJson(events) {
		var times = [];
		for (var i = 0; i < events.length; i++) {
			//insert value/label pairs
			times.push({
				time: {value: events[i]["tl:at"]},
				value: [events[i]["afo:value"]]
			});
		}
		return times;
	}

}
