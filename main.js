//express para las rutas
const express = require('express');
const app = express();
// importando jwt
const jwt = require('jsonwebtoken');
// para habiltar el uso del archivo de ambiente .env
require('dotenv').config();
// console.log('desde env: ',process.env.CLAVE_SECRETA) 

//obteniendo data QUE VENDRIA SIENDO EL PAYLOAD DE CADA USUARIO
const agentes = require('./data/agentes.js')
// console.log(agentes.results);
const tiempoExpiracion = Math.floor(Date.now() / 1000) + 120; // expira en 2 minutos
// const options = { expiresIn: '2m' }; //se tiene que llamar expiresIn si o si
const clave = process.env.CLAVE_SECRETA; 

//levantando servidor en puerto 3000
app.listen(3000, () => { console.log('Servidor levantado en puerto 3000'); });

//obteniendo el html que podría estar en una carpeta public 
app.use(express.static('public'));
app.get('/', (req, res) => { res.sendFile(__dirname + "/index.html"); });

// 1. Crear una ruta que autentique a un agente basado en sus credenciales y genere un token con sus datos.  (3 Puntos) 
// se llama SignIn porque <form action="/SignIn">
app.get('/SignIn', (req, res) => {

    try {
        //Recibo lo que ingreso en el formulario 
        const { email, password } = req.query;
        // console.log(email, password)
        //y ahora hay que ver que coincida con los agentes
        const userEncontrado = agentes.results.find(user => user.email === email && user.password === password); //devuelve un objeto, o el que encontró o undefined
        // console.log('user ',userEncontrado)
        // console.log('agentes.results[0] ',agentes.results[0])
        if (userEncontrado) {
            //si lo ingresado coincide, se crea un token para ese usuario
            //sign recibe el payload que es un objeto y una clave //DE DONDE TOMA EL HEADER QUE ES EL HEADER no sé creo qe es automatico...
            // la fecha de vencimiento se entrega en la propiedad exp
            // const token = jwt.sign({ userEncontrado, clave, options);
            const token = jwt.sign({ userEncontrado, exp: tiempoExpiracion}, clave);
            // console.log('token signed ',token)
            // res.send('Ingresaste a tu cuenta, bienvenido');

            //devolver html con email 
            //link redirigir a ruta restringida(qwue pide un token)
            //sesionstorage //persistencia
            res.status(200).send(`
        <a href="/area51?token=${token}"> 
            <p> Ingresar al Area 51 </p> 
        </a>       
        <h3>Bienvenido, ${email}.</h3>     
        <script>     
            sessionStorage.setItem('token', JSON.stringify("${token}"))   
            alert('Sesión iniciada correctamente.');  
        </script>     
        `);
            //sessionStorage Consola>Aplicacion>Almacenamiento de sesion
        } else {
            res.status(401).send(`
                <h4> No figuras en nuestro sistema. </h4>        
            <script>     
                console.log('Error 401, usuario no autorizado');
                setTimeout(function() {
                    sessionStorage.removeItem('token');
                    window.location.href = '/';
                }, 3000);
            </script>     
            `);
        }
    } catch (error) {
        res.status(500).send({
            error: 500,
            mensaje: 'Error del servidor'
        })
    }
});

//401 Unauthorized: Indica que no se ha proporcionado la autenticación o que la autenticación proporcionada es incorrecta.
//403 Forbidden: Indica que la autenticación es válida, pero el usuario autenticado no tiene permiso para acceder al recurso.

//middleware que verifica el token que se le pasa aqui <a href="/area51?token=${token}">
//verify recibe el token generado y la clave, y un callback que da o error o data
// jwt.verify(token, clave, (err, data) => { //data es lo que esta dentro del token, si no se verifica queda undefined
//     console.log(err ? "Token inválido" : data)
// });
const verificar = (req, res, next) => {
    // token en queryString
    const { token } = req.query;

    //en caso de que no se haya generado el token
    if (!token) {
        res.status(401).send("No hay token, no esta Autorizado");
    } else {
        //verificar el token 
        jwt.verify(token, clave, (error, user) => {
            if (error) {
                res.status(403).send(`
                <h4>Token inválido o ha expirado</h4>
                <script>
                    console.log('Token inválido o ha expirado');
                    setTimeout(function() {
                        sessionStorage.removeItem('token');
                        window.location.href = '/';
                    }, 3000);
                </script>
                `)
            }
            else {
                // Si el token es válido, agrega la información decodificada del token al objeto de la solicitud (req)
                // console.log("Valor de req.user antes: ", req.user)
                // console.log("Valor de user del verify: ", user)
                req.user = user; // asignamos aqui al req.user, el user que es decodificado del token
                console.log("Valor de req.user despues: ", req.user)
                //dar paso a la ejecucion de la ruta luego de verificar el token
                next();
            }
        });
    };
};

//restringida
app.get('/area51', verificar, (req, res) => {
    // console.log(req) user viene como propiedad del objeto req
    const user = req.user;
    try {
        // throw new Error('Acceso no permitido');
        res.status(200).send(`
        <style>
            *{
                background-color:black;
                color:white;
                text-align:center;
                margin:0 auto;
            }
            h1{
                display:inline;
            }
            h2{
                margin: 30px 0;
            }
            img{
                display:block;
            }
        </style>
        <h2>Es un placer tenerle de vuelta ${user.userEncontrado.email}, tiene usted menos de 2 minutos para extirpar crías al alien.</h2>
        <img id="img" src="/alien_autopsy.jpeg">
        <audio autoplay src="silbido.m4a"></audio>
        <h1 id="emoji"></h1>

        <script>
            const emoji = document.getElementById('emoji');
            const img = document.getElementById('img');
            img.addEventListener('click', () =>{
               emoji.innerHTML += '👽'
            })

            const tiempoExpiracion = ${user.exp} * 1000; 
            const tiempoRestante = tiempoExpiracion - Date.now();
            setTimeout(function() {
                alert("Sesión expirada, hasta pronto.");
                sessionStorage.removeItem('token');
                window.location.href = '/';
            }, tiempoRestante);
        </script>
        `);
    } catch (error) {
        res.status(401).send('Error: ' + error.message); 
    }
});
