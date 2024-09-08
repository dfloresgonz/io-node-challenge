import * as apiGateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';

export class PaymentGateway extends Construct {
  constructor(scope: Construct, id: string, usersStateMachine: sfn.StateMachine) {
    super(scope, id);

    const api = new apiGateway.RestApi(this, 'PaymentApi', {
      restApiName: 'Payment API',
      description: 'Backend - Payment API',
    });

    // Permisos para que API Gateway pueda invocar la Step Function
    const role = new iam.Role(this, 'ApiGatewayStepFunctionsRole', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
    });

    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['states:StartExecution'],
        resources: [usersStateMachine.stateMachineArn],
      }),
    );

    const stepFunctionIntegration = new apiGateway.AwsIntegration({
      service: 'states',
      action: 'StartExecution',
      options: {
        credentialsRole: role,
        integrationResponses: [
          {
            statusCode: '200',
          },
        ],
        requestTemplates: {
          'application/json': `{
        "input": "$util.escapeJavaScript($input.body)",
        "stateMachineArn": "${usersStateMachine.stateMachineArn}"
      }`,
        },
      },
    });

    // Crear un recurso de API y método para invocar la Step Function
    const stepFunctionResource = api.root.addResource('payment');
    stepFunctionResource.addMethod('POST', stepFunctionIntegration, {
      methodResponses: [{ statusCode: '200' }],
    });
  }
}
