const express = require('express');
const { body, validationResult } = require('express-validator');
const TwilioService = require('../services/twilioService');
const logger = require('../utils/logger');
const { callLimiter, smsLimiter } = require('../middleware/rateLimiter');

const router = express.Router();
const twilioService = new TwilioService();

// Validation middleware
const validatePhoneNumber = body('to')
    .isMobilePhone()
    .withMessage('Invalid phone number format');

const validateSpoofNumber = body('spoofNumber')
    .isMobilePhone()
    .withMessage('Invalid spoof number format');

const validateSMSBody = body('body')
    .isLength({ min: 1, max: 1600 })
    .withMessage('SMS body must be between 1 and 1600 characters');

/**
 * POST /api/spoof/call
 * Make a spoof call with custom caller ID
 */
router.post('/call', 
    callLimiter,
    [
        validatePhoneNumber,
        validateSpoofNumber,
        body('message').optional().isLength({ max: 500 }),
        body('record').optional().isBoolean(),
        body('useConference').optional().isBoolean(),
        body('voiceModulation.voice').optional().isIn(['alice', 'man', 'woman']),
        body('voiceModulation.language').optional().isLength({ min: 2, max: 10 })
    ],
    async (req, res) => {
        try {
            // Check for validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const { to, spoofNumber, message, record, useConference, voiceModulation } = req.body;

            // Additional phone number validation
            if (!twilioService.validatePhoneNumber(to)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid target phone number format'
                });
            }

            if (!twilioService.validatePhoneNumber(spoofNumber)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid spoof phone number format'
                });
            }

            const options = {
                message: message || 'Connecting your call...',
                record: record || false,
                useConference: useConference || false,
                voiceModulation: voiceModulation,
                statusCallback: `${process.env.VOICE_WEBHOOK_URL}/status`,
                recordingCallback: `${process.env.VOICE_WEBHOOK_URL}/recording`
            };

            const result = await twilioService.makeSpoofCall(to, spoofNumber, options);

            if (result.success) {
                logger.info('Spoof call request processed', {
                    sessionId: result.sessionId,
                    to: to,
                    spoofNumber: spoofNumber,
                    ip: req.ip
                });

                res.json({
                    success: true,
                    sessionId: result.sessionId,
                    callId: result.callId,
                    message: result.message,
                    spoofNumber: result.spoofNumber
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: result.error
                });
            }
        } catch (error) {
            logger.error('Error in spoof call endpoint', {
                error: error.message,
                stack: error.stack,
                ip: req.ip
            });

            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
);

/**
 * POST /api/spoof/sms
 * Send SMS with custom sender ID
 */
router.post('/sms',
    smsLimiter,
    [
        validatePhoneNumber,
        validateSMSBody,
        body('from').optional().isMobilePhone()
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const { to, body: messageBody, from } = req.body;

            const options = {
                from: from || process.env.SPOOF_CALLER_ID
            };

            const result = await twilioService.sendSMS(to, messageBody, options);

            if (result.success) {
                logger.info('Spoof SMS sent', {
                    messageId: result.messageId,
                    to: to,
                    from: options.from,
                    ip: req.ip
                });

                res.json({
                    success: true,
                    messageId: result.messageId,
                    message: result.message
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: result.error
                });
            }
        } catch (error) {
            logger.error('Error in spoof SMS endpoint', {
                error: error.message,
                stack: error.stack,
                ip: req.ip
            });

            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
);

/**
 * GET /api/spoof/session/:sessionId
 * Get call session information
 */
router.get('/session/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = twilioService.getCallSession(sessionId);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        res.json({
            success: true,
            session: {
                sessionId: sessionId,
                status: session.status,
                targetNumber: session.targetNumber,
                spoofNumber: session.spoofNumber,
                startTime: session.startTime,
                conferenceName: session.conferenceName
            }
        });
    } catch (error) {
        logger.error('Error getting session info', {
            error: error.message,
            sessionId: req.params.sessionId
        });

        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * POST /api/spoof/session/:sessionId/end
 * End a call session
 */
router.post('/session/:sessionId/end', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const result = await twilioService.endCallSession(sessionId);

        if (result.success) {
            res.json({
                success: true,
                message: result.message
            });
        } else {
            res.status(404).json({
                success: false,
                message: result.error
            });
        }
    } catch (error) {
        logger.error('Error ending session', {
            error: error.message,
            sessionId: req.params.sessionId
        });

        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * GET /api/spoof/recordings/:callSid
 * Get call recordings
 */
router.get('/recordings/:callSid', async (req, res) => {
    try {
        const { callSid } = req.params;
        const result = await twilioService.getCallRecordings(callSid);

        if (result.success) {
            res.json({
                success: true,
                recordings: result.recordings
            });
        } else {
            res.status(500).json({
                success: false,
                message: result.error
            });
        }
    } catch (error) {
        logger.error('Error getting recordings', {
            error: error.message,
            callSid: req.params.callSid
        });

        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * POST /api/spoof/webhook/voice
 * Handle Twilio voice webhooks
 */
router.post('/webhook/voice', (req, res) => {
    try {
        const { CallSid, CallStatus, From, To } = req.body;
        
        logger.info('Voice webhook received', {
            callSid: CallSid,
            status: CallStatus,
            from: From,
            to: To
        });

        // Generate appropriate TwiML response
        const twiml = new (require('twilio')).twiml.VoiceResponse();
        
        if (CallStatus === 'ringing') {
            twiml.say({ voice: 'alice' }, 'Please hold while we connect your call.');
        }

        res.type('text/xml');
        res.send(twiml.toString());
    } catch (error) {
        logger.error('Error in voice webhook', {
            error: error.message,
            body: req.body
        });

        res.status(500).send('Error processing webhook');
    }
});

/**
 * POST /api/spoof/webhook/conference/:conferenceName
 * Handle conference webhooks
 */
router.post('/webhook/conference/:conferenceName', (req, res) => {
    try {
        const { conferenceName } = req.params;
        const twiml = twilioService.generateConferenceTwiML(conferenceName, {
            welcomeMessage: 'You are now being connected to the conference.',
            record: true,
            recordingCallback: `${process.env.VOICE_WEBHOOK_URL}/recording`
        });

        res.type('text/xml');
        res.send(twiml);
    } catch (error) {
        logger.error('Error in conference webhook', {
            error: error.message,
            conferenceName: req.params.conferenceName
        });

        res.status(500).send('Error processing conference webhook');
    }
});

/**
 * POST /api/spoof/webhook/status
 * Handle call status webhooks
 */
router.post('/webhook/status', (req, res) => {
    try {
        const { CallSid, CallStatus, CallDuration } = req.body;
        
        logger.info('Call status update', {
            callSid: CallSid,
            status: CallStatus,
            duration: CallDuration
        });

        res.status(200).send('OK');
    } catch (error) {
        logger.error('Error in status webhook', {
            error: error.message,
            body: req.body
        });

        res.status(500).send('Error processing status webhook');
    }
});

/**
 * POST /api/spoof/webhook/recording
 * Handle recording webhooks
 */
router.post('/webhook/recording', (req, res) => {
    try {
        const { RecordingSid, RecordingUrl, CallSid } = req.body;
        
        logger.info('Recording completed', {
            recordingSid: RecordingSid,
            recordingUrl: RecordingUrl,
            callSid: CallSid
        });

        res.status(200).send('OK');
    } catch (error) {
        logger.error('Error in recording webhook', {
            error: error.message,
            body: req.body
        });

        res.status(500).send('Error processing recording webhook');
    }
});

module.exports = router;
