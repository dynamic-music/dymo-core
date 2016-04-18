# dymo-core
A core package that manages and plays back dynamic music objects (dymos) and their renderings.

## Embedding dymo-core in a web app

You can add dymo-core to any web app using either [NPM](https://www.npmjs.com)
```bash
$ npm install dymo-core
```
or [Bower](http://bower.io/#install-bower)
```bash
$ bower install dymo-core
```

Then, simply include `[bower_components]/dymo-core/dist/dymo-core.min.js` in your code.

The `DymoManager` class allows you to easily load and playback dymos. First you need to create a Web Audio API audio context and pass it to the constructor:
```javascript
var dymoManager = new DymoManager(audioContext);
```
Then, you can load and play a dymo and it's rendering as follows (indicating either relative local paths or uris):
```javascript
dymoManager.loadDymoAndRendering('example-dymo.json', 'example-rendering.json', function() {
	dymoManager.startPlaying();
});
```
The callback tells you when the dymo, its audio files, and the rendering are done loading, so that you can start playing it back. You can stop the dymo analogously using
```javascript
dymoManager.stopPlaying();
```
If you plan on using custom UI controls in your application, the dymo manager can provide you with the corresponding UI controls you added to your dymo spec (see next section). The following method takes the name you gave it in the json definition as a parameter.
```javascript
dymoManager.getUIControl(name);
```
You can also use the [Semantic Player](https://github.com/florianthalmann/semantic-player.git) framework to create generic user interfaces more easily.

## Creating dymos manually in json-ld

In this section you'll learn how to define dymos manually using [json-ld](http://json-ld.org). This can be quite tedious once dymos get more complex or once they include analytical features and semantic annotations. In that case you might prefer to use the [Dymo Designer](https://github.com/florianthalmann/dymo-designer.git) or the [Dymo Generator](https://github.com/florianthalmann/dymo-generator.git). Finally, instead of using json-ld, you can also define them directly in RDF which won't be described here. You can refer to [this paper](http://ieeexplore.ieee.org/xpls/abs_all.jsp?arnumber=7439304) for some examples.

### A simple dymo to start with

The most basic dymo that can be played back is just a single object with an associated audio file. You can define one as follows:

```json
{
	"@context":"http://tiny.cc/dymo-context",
	"@id":"exampleDymo",
	"@type":"Dymo",
	"source":"example.m4a"
}
```

In the first line you refer to the json-ld context, which is necessary for the dymo to become linked data and which allows you to use all the keywords necessary to define dymos. Then you define an id which can be chosen freely but has to be unique within the structure. The third line tells the system that it is indeed a dymo that you're defining here. Finally, you specify a relative local path or a uri that points to the dymo's audio file.

You can then play back this dymo using the [Semantic Player](https://github.com/florianthalmann/semantic-player.git) or by embedding *dymo-core* in a web app (instructions [above](#embedding-dymo-core-in-a-web-app)).

### Defining a rendering

In order to make the dymo dynamic, adaptive, or interactive you can define a *rendering* as follows:

```json
{
	"@context":"http://tiny.cc/dymo-context",
	"@id":"exampleRendering",
	"@type":"Rendering",
	"mappings":[
		{
			"domainDims":[{"name":"randomControl","type":"Random"}],
			"function":{"args":["a"],"body":"return a;"},
			"dymos":["exampleDymo"],
			"parameter":"Amplitude"
		}
	]
}
```

The first few lines are analogous to the ones we used to define the dymo in the previous section. What follows is a list of mappings which contains only one in this example. First we specify a number of domain dimensions to map from, here a one-dimensional space with just a random control. Then, we define a mapping function that can consist of arbitrary javascript code, the arguments of which are going to stem from the domain dimensions. Here, we simple map the value `a` coming from the random control with an identity function. `dymos` and `parameter` define where the result of the function is mapped to, in this case the `Amplitude` parameter of the `exampleDymo` defined in the previous section.

Within dymo-core you can use any of the *auto controls* defined by the ontology, as well as *custom controls*, which you can manipulate yourself within your app. You can define a *custom control* as follows
```json
{"name":"customControl","type":"Custom"}
```
You can then get it by its name from the `DymoManager`, as explained [above](#embedding-dymo-core-in-a-web-app).

For now, *sensor controls* and automatically generated *UI controls* can only be used within the [Semantic Player](https://github.com/florianthalmann/semantic-player.git) framework.

### Creating a hierarchy by adding parts

### Defining higher-level parameters

