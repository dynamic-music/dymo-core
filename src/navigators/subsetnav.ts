export abstract class SubsetNavigator {

  protected dymoUri;

  constructor(dymoUri) {
    this.dymoUri = dymoUri;
  }

  abstract getCopy(dymoUri: string, getNavigator: Function): SubsetNavigator;

  abstract getNextParts();

}