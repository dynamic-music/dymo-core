function GraphControls(graph) {
	
	var self = this;
	
	this.nextNodeControl = new Control(GRAPH_CONTROL, AUTO_CONTROL, requestValue, reset, update);
	
	//graph = [[],[],[],[5],[8],[7],[5,6,7,8],[6],[],[5,6,7,8]];
	
	var currentNode = null;
	this.leapingProbability = new Parameter(this, 0.5);
	//if true the control continues after the part index leaped to
	//if false it stays on the general timeline and merely replaces parts according to the graph
	this.continueAfterLeaping = new Parameter(this, 0, true);
	
	this.setGraph = function(g) {
		graph = g;
	}
	
	function calculateNextNode() {
		if (currentNode == null) {
			currentNode = 0;
		} else {
			currentNode++;
			if (graph && graph[currentNode] && graph[currentNode].length > 0) {
				if (Math.random() < self.leapingProbability.getValue()) {
					options = graph[currentNode];
					selectedOption = Math.floor(Math.random()*options.length);
					if (!self.continueAfterLeaping.getValue()) {
						return options[selectedOption];
					} else {
						currentNode = options[selectedOption];
					}
				}
			}
		}
		return currentNode;
	}
	
	function requestValue() {
		return calculateNextNode();
	}
	
	function reset() {
		currentNode = null;
	}
	
	function update(node) {
		currentNode = node;
	}
	
}