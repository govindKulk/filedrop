exports.handler = async function (event, context) {
    // try {
    //     const { length, breadth } = event;
    //     if (!length || !breadth) {
    //         return {
    //         statusCode: 400,
    //         headers: {'Content-Type': 'application/json'},
    //         body: {message: "both length and breadth are required"}
    //         }
    //     }

    //     const area = calculateArea(length, breadth);
    //     return {
    //         statusCode: 200,
    //         headers: {'Content-Type': 'application/json'},
    //         body: {area}
    //     }

    // } catch (error) {
    //     console.log(error);
    //     throw Error("something went wrong try again")
    // }

    console.log('request:', JSON.stringify(event, undefined, 2))
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/plain' },
        body: `Hello, CDK! You've hit ${event.path}\n`,
    }
}

