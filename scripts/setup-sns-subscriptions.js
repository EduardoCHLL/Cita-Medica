const AWS = require('aws-sdk');

// Configurar AWS SDK
AWS.config.update({ region: process.env.AWS_REGION || 'us-east-1' });
const sns = new AWS.SNS();
const sqs = new AWS.SQS();

async function setupSNSSubscriptions() {
  try {
    console.log('Configurando suscripciones de SNS...');

    // Obtener el ARN del topic SNS automáticamente
    const topicArn = await getSNSTopicArn();
    if (!topicArn) {
      throw new Error('No se encontró el SNS Topic "sns_medical"');
    }

    console.log('SNS Topic encontrado:', topicArn);

    // Obtener las URLs de las colas SQS
    const stage = process.env.STAGE || 'dev';
    
    // Obtener los ARNs de las colas usando los nombres correctos
    const peruQueues = await sqs.listQueues({ QueueNamePrefix: 'sqs_pe' }).promise();
    const chileQueues = await sqs.listQueues({ QueueNamePrefix: 'sqs_cl' }).promise();

    if (!peruQueues.QueueUrls || peruQueues.QueueUrls.length === 0) {
      throw new Error('No se encontró la cola de Perú (sqs_pe)');
    }

    if (!chileQueues.QueueUrls || chileQueues.QueueUrls.length === 0) {
      throw new Error('No se encontró la cola de Chile (sqs_cl)');
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

async function getSNSTopicArn() {
  try {
    const topics = await sns.listTopics().promise();
    const topic = topics.Topics.find(t => t.TopicArn.includes('sns_medical'));
    return topic ? topic.TopicArn : null;
  } catch (error) {
    console.error('Error obteniendo SNS Topic:', error);
    return null;
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