# dymo-core
A core package that manages and plays back dynamic music objects (dymos) and their renderings.

##Creating dymos manually in json-ld

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

### Defining a rendering

```json
{
}
```

### Creating a hierarchy by adding parts

