// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { App, Aspects, DefaultStackSynthesizer, Stack } from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Template } from 'aws-cdk-lib/assertions';
import { AwsSolutionsChecks } from 'cdk-nag';
import { JiraBlueprintStack } from '../jira-blueprint-stack';

const description = 'ASR Blueprint Stack';
const solutionId = 'SO9999';
const solutionTMN = 'my-solution-tmn';
const solutionVersion = 'v9.9.9';
const solutionDistBucket = 'sharrbukkit';

function getStack(): Stack {
  const app = new App();

  const stack = new JiraBlueprintStack(app, 'JiraBlueprintStack', {
    analyticsReporting: false,
    synthesizer: new DefaultStackSynthesizer({ generateBootstrapVersionRule: false }),
    description,
    solutionInfo: {
      solutionId: solutionId,
      solutionTMN: solutionTMN,
      solutionVersion: solutionVersion,
      solutionDistBucket: solutionDistBucket,
      runtimePython: Runtime.PYTHON_3_11,
    },
    functionName: 'Jira-Function-Name',
    serviceName: 'Jira',
    requiredSecretKeys: ['Username', 'Password'],
    exampleUri: 'https://my-jira-instance.atlassian.net',
    uriPattern: String.raw`^https:\/\/.+\.atlassian\.net$`,
  });

  Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));
  return stack;
}

describe('JiraBlueprintStack', () => {
  const template = Template.fromStack(getStack());

  test('Matches snapshot', () => {
    expect(template).toMatchSnapshot();
  });

  test('Has necessary parameters', () => {
    template.hasParameter('InstanceURI', {
      Type: 'String',
    });
    template.hasParameter('JiraProjectKey', {
      Type: 'String',
    });
    template.hasParameter('SecretArn', {
      Type: 'String',
    });
  });

  test('Has ticket generator function', () => {
    template.hasResource('AWS::Lambda::Function', {
      Properties: {
        Handler: 'jira_ticket_generator.lambda_handler',
        Runtime: 'python3.11',
        Timeout: 15,
      },
    });
  });

  test('Has ticket generator IAM permissions', () => {
    template.hasResource('AWS::IAM::Policy', {
      Properties: {
        PolicyDocument: {
          Statement: [
            {
              Action: 'secretsmanager:GetSecretValue',
              Effect: 'Allow',
              Resource: {
                Ref: 'SecretArn',
              },
            },
            {
              Action: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
              Effect: 'Allow',
              Resource: '*',
            },
            {
              Action: 'organizations:ListAccounts',
              Effect: 'Allow',
              Resource: '*',
            },
          ],
          Version: '2012-10-17',
        },
      },
    });
  });

  test('Outputs ticket generator function ARN', () => {
    template.hasOutput('TicketGeneratorLambdaFunction', {});
  });
});