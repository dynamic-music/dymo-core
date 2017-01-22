export abstract class SubsetNavigator {

  protected dymoUri;

  constructor(dymoUri) {
    this.dymoUri = dymoUri;
  }

  abstract getNextParts();

}