function inheritPrototype(child, parent) {
	var copyOfParent = Object.create(parent.prototype);
	copyOfParent.constructor = child;
	child.prototype = copyOfParent;
}