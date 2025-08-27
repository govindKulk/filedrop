exports.handler = async function (event, context) {
    try {
        // Handle different event sources: API Gateway queryStringParameters, JSON body, or direct test event
        const source = event.queryStringParameters
            || (event.body ? (() => { try { return JSON.parse(event.body); } catch { return null } })() : null)
            || event;

        const length = Number(source?.length);
        const breadth = Number(source?.breadth);

        if (!length || !breadth || isNaN(length) || isNaN(breadth)) {
            return {
                statusCode: 400,
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({message: "both length and breadth are required and must be valid numbers"})
            };
        }

        const area = calculateArea(length, breadth);
        return {
            statusCode: 200,
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({area})
        };

    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({message: "something went wrong, try again"})
        };
    }
}

function calculateArea(length, breadth) {
    return length * breadth;
}

