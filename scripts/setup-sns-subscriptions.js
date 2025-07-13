const AWS = require('aws-sdk');

// Configurar AWS SDK
AWS.config.update({ region: process.env.AWS_REGION || 'us-east-1' });
const sns = new AWS.SNS();
const sqs = new AWS.SQS();

async function setupSNSSubscriptions() {
  try {
    console.log('Configurando suscripciones de SNS...');

    // Obtener el ARN del topic SNS
    const topicArn = process.env.SNS_TOPIC_ARN;
    if (!topicArn) {
      throw new Error('SNS_TOPIC_ARN no está configurado');
    }

    // Obtener las URLs de las colas SQS
    const stage = process.env.STAGE || 'dev';
    const serviceName = 'cita-medica-lambda';
    
    const peruQueueUrl = `https://sqs.${AWS.config.region}.amazonaws.com/${process.env.AWS_ACCOUNT_ID}/${serviceName}-${stage}-PeruQueue-*`;
    const chileQueueUrl = `https://sqs.${AWS.config.region}.amazonaws.com/${process.env.AWS_ACCOUNT_ID}/${serviceName}-${stage}-ChileQueue-*`;

    // Obtener los ARNs de las colas
    const peruQueues = await sqs.listQueues({ QueueNamePrefix: `${serviceName}-${stage}-PeruQueue` }).promise();
    const chileQueues = await sqs.listQueues({ QueueNamePrefix: `${serviceName}-${stage}-ChileQueue` }).promise();

    if (!peruQueues.QueueUrls || peruQueues.QueueUrls.length === 0) {
      throw new Error('No se encontró la cola de Perú');
    }

    if (!chileQueues.QueueUrls || chileQueues.QueueUrls.length === 0) {
      throw new Error('No se encontró la cola de Chile');
    }

    const peruQueueArn = await getQueueArn(peruQueues.QueueUrls[0]);
    const chileQueueArn = await getQueueArn(chileQueues.QueueUrls[0]);

    console.log('ARNs de las colas:', { peruQueueArn, chileQueueArn });

    // Configurar políticas de SQS para permitir SNS
    await configureSQSForSNS(peruQueues.QueueUrls[0], topicArn);
    await configureSQSForSNS(chileQueues.QueueUrls[0], topicArn);

    // Crear suscripción para Perú
    const peruSubscription = await sns.subscribe({
      TopicArn: topicArn,
      Protocol: 'sqs',
      Endpoint: peruQueueArn,
      Attributes: {
        FilterPolicy: JSON.stringify({
          countryISO: ['PE']
        }),
        FilterPolicyScope: 'MessageAttributes'
      }
    }).promise();

    // Crear suscripción para Chile
    const chileSubscription = await sns.subscribe({
      TopicArn: topicArn,
      Protocol: 'sqs',
      Endpoint: chileQueueArn,
      Attributes: {
        FilterPolicy: JSON.stringify({
          countryISO: ['CL']
        }),
        FilterPolicyScope: 'MessageAttributes'
      }
    }).promise();

    console.log('Suscripciones creadas exitosamente:', {
      peruSubscription: peruSubscription.SubscriptionArn,
      chileSubscription: chileSubscription.SubscriptionArn
    });

  } catch (error) {
    console.error('Error configurando suscripciones de SNS:', error);
    throw error;
  }
}

async function getQueueArn(queueUrl) {
  const attributes = await sqs.getQueueAttributes({
    QueueUrl: queueUrl,
    AttributeNames: ['QueueArn']
  }).promise();
  
  return attributes.Attributes.QueueArn;
}

async function configureSQSForSNS(queueUrl, topicArn) {
  const queueArn = await getQueueArn(queueUrl);
  
  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: {
          Service: 'sns.amazonaws.com'
        },
        Action: 'sqs:SendMessage',
        Resource: queueArn,
        Condition: {
          ArnEquals: {
            'aws:SourceArn': topicArn
          }
        }
      }
    ]
  };

  await sqs.setQueueAttributes({
    QueueUrl: queueUrl,
    Attributes: {
      Policy: JSON.stringify(policy)
    }
  }).promise();

  console.log(`Política configurada para cola: ${queueUrl}`);
}

// Ejecutar si se llama directamente
if (require.main === module) {
  setupSNSSubscriptions()
    .then(() => {
      console.log('Configuración completada exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error en la configuración:', error);
      process.exit(1);
    });
}

module.exports = { setupSNSSubscriptions }; 