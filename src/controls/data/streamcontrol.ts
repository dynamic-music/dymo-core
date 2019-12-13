import { DataControl } from '../datacontrol';
import { SuperDymoStore } from '../../globals/types';
import { Fetcher } from '../../util/fetcher';

/**
 * A control based on data streams
 */
export class DataStreamControl extends DataControl {

//Rx.Node.fromReadableStream(fetch('https://stream.meetup.com/2/rsvps').then(r=>{console.log(r.body);return r.body}))

	constructor(uri: string, store: SuperDymoStore, fetcher?: Fetcher) {
		super(uri, "", ()=>0, store, fetcher);

		/*var requestStream = Rx.Observable.just('https://stream.meetup.com/2/open_events');

		var responseStream = requestStream
			.flatMap(function(requestUrl) {
				return Rx.Observable.fromPromise(fetch(requestUrl));
			})
			.map(r => r.body)
			.flatMap(s => Rx.Node.fromReadableStream(s));

		responseStream
			.subscribe(
				x => console.log(x),
				err => console.log(err),
				() => console.log("complete")
			);*/

	}

}
