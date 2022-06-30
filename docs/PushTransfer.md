# PushTransfer

## API

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

### bytesTransferred

The number of bytes transferred so far.

Type: [number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)

### IEmissions

enforce EventEmitter typing

#### end

Emitted on error.

Type: function (): void

#### progress

**(stats)** Emitted when a chunk has been flushed to the ADB connection.

Type: function (stats: {bytesTransferred: [number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)}): void

##### Parameters

*   `stats`  An object with the following stats about the transfer:

#### error

Emitted when the transfer has successfully completed.

Type: function (data: [Error](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error)): void

### PushTransfer

**Extends EventEmitter**

A simple EventEmitter, mainly for keeping track of the progress.

#### cancel

Cancels the transfer by ending both the stream that is being pushed and the sync connection. This will most likely end up creating a broken file on your device. **Use at your own risk.** Also note that you must create a new sync connection if you wish to continue using the sync service.

Returns **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)** The pushTransfer instance.

#### waitForEnd

get end notification using Promise

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<void>** 