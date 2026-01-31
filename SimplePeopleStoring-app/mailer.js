const nodemailer = require('nodemailer');

app.post('/resetPwd', loginLimiter, async (req, res) => {
    try{

    } catch (e){
        console.error('mailing error: ', e);
        res.status(500).json({succes: false, message: 'Server Error . . .'})
    }
})
